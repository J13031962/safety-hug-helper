import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dbOptions } from "../_shared/dbSchema.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ble-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_BUTTONS = new Set(["panic", "medical", "fire", "disaster", "domestic"]);
const TIME_DEDUP_WINDOW_MS = 30_000;
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const phonesMatch = (a: string, b: string) => !!a && !!b && (a === b || a.endsWith(b) || b.endsWith(a));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "method_not_allowed" }, 405);
  }

  try {
    const globalToken = Deno.env.get("BLE_GATEWAY_TOKEN") || "";
    const provided = req.headers.get("x-ble-token") || "";

    if (!provided) {
      console.warn("[BLE] Missing x-ble-token");
      return json({ success: false, error: "unauthorized" }, 401);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "invalid_json" }, 400);
    }

    const event_id = String(body?.event_id || "").trim();
    const device_id = String(body?.device_id || "").trim();
    const device_identifier = String(body?.device_identifier || "").trim();
    const button = String(body?.button || "").trim().toLowerCase();
    const pressed_at_raw = body?.pressed_at ? String(body.pressed_at) : null;

    if (!event_id) return json({ success: false, error: "missing_event_id" }, 400);
    if (!device_id && !device_identifier) {
      return json({ success: false, error: "missing_device_identity" }, 400);
    }
    if (!ALLOWED_BUTTONS.has(button)) {
      return json({ success: false, error: "invalid_button", allowed: [...ALLOWED_BUTTONS] }, 400);
    }

    let pressedAt: Date | null = null;
    if (pressed_at_raw) {
      const d = new Date(pressed_at_raw);
      if (isNaN(d.getTime())) return json({ success: false, error: "invalid_pressed_at" }, 400);
      if (Math.abs(Date.now() - d.getTime()) > MAX_CLOCK_SKEW_MS) {
        return json({ success: false, error: "pressed_at_out_of_range" }, 400);
      }
      pressedAt = d;
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    dbOptions,
    );

    // ---- Resolve device ----
    let query = sb
      .from("ble_devices")
      .select("id, device_id, device_identifier, name, model, phone_number, registered_number_id, parcel_id, enabled, token_hash");

    query = device_id
      ? query.eq("device_id", device_id)
      : query.ilike("device_identifier", device_identifier);

    const { data: device, error: deviceErr } = await query.maybeSingle();

    if (deviceErr) {
      console.error("[BLE] Device lookup error:", deviceErr.message);
      return json({ success: false, error: "db_error" }, 500);
    }
    if (!device) {
      console.warn(`[BLE] Unknown device | device_id=${device_id || device_identifier} | event_id=${event_id}`);
      return json({ success: false, error: "device_not_registered" }, 404);
    }

    // ---- Token: per-device hash when present, otherwise the global gateway token ----
    let authorized = false;
    if (device.token_hash) {
      authorized = safeEqual(await sha256Hex(provided), device.token_hash);
    } else if (globalToken) {
      authorized = safeEqual(provided, globalToken);
    }
    if (!authorized) {
      console.warn(`[BLE] Unauthorized token | device_id=${device.device_id} | event_id=${event_id}`);
      return json({ success: false, error: "unauthorized" }, 401);
    }

    if (!device.enabled) {
      console.log(`[BLE] Device disabled | device_id=${device.device_id} | event_id=${event_id}`);
      return json({ success: false, error: "device_disabled" }, 403);
    }

    // ---- Parcel isolation: always the parcel bound to the device ----
    const { data: parcel, error: parcelErr } = await sb
      .from("parcels")
      .select("id, name")
      .eq("id", device.parcel_id)
      .maybeSingle();

    if (parcelErr || !parcel) {
      console.error(`[BLE] Parcel not resolvable for device ${device.device_id}`);
      return json({ success: false, error: "parcel_not_found" }, 403);
    }

    const claimedParcel = String(body?.parcel_name || "").trim();
    if (claimedParcel && claimedParcel.toLowerCase() !== parcel.name.trim().toLowerCase()) {
      console.warn(`[BLE] parcel_mismatch | device_id=${device.device_id} | claimed=${claimedParcel} | authorized=${parcel.name}`);
      return json({ success: false, error: "parcel_mismatch", authorized_parcel: parcel.name }, 403);
    }

    const parcel_name = parcel.name;

    // ---- DB deduplication: unique event_id ----
    const { data: eventRow, error: eventErr } = await sb
      .from("ble_events")
      .insert({
        event_id,
        ble_device_id: device.id,
        button,
        pressed_at: pressedAt ? pressedAt.toISOString() : null,
        payload: body,
      })
      .select("id")
      .single();

    if (eventErr) {
      if (eventErr.code === "23505") {
        console.log(`[BLE] Duplicate event_id=${event_id} | device_id=${device.device_id}`);
        return json({ success: true, event_id, duplicate: true, reason: "duplicate_event_id" });
      }
      console.error("[BLE] Event insert error:", eventErr.message);
      return json({ success: false, error: "db_error" }, 500);
    }

    // ---- DB time-window deduplication (~30s, same device + same button) ----
    const since = new Date(Date.now() - TIME_DEDUP_WINDOW_MS).toISOString();
    const { data: recent } = await sb
      .from("ble_events")
      .select("id, alarm_id, received_at")
      .eq("ble_device_id", device.id)
      .eq("button", button)
      .neq("id", eventRow.id)
      .gte("received_at", since)
      .not("alarm_id", "is", null)
      .order("received_at", { ascending: false })
      .limit(1);

    if (recent && recent.length > 0) {
      console.log(`[BLE] Duplicate within window | device_id=${device.device_id} | event_id=${event_id} | previous_alarm=${recent[0].alarm_id}`);
      await sb.from("ble_events").update({ alarm_id: recent[0].alarm_id }).eq("id", eventRow.id);
      return json({
        success: true,
        event_id,
        alarm_id: recent[0].alarm_id,
        duplicate: true,
        reason: "duplicate_within_window",
      });
    }

    // ---- Resolve user (registered_numbers) ----
    let reg: any = null;
    if (device.registered_number_id) {
      const { data } = await sb
        .from("registered_numbers")
        .select("id, phone_number, owner_name, house_number, user_number, parcel_name")
        .eq("id", device.registered_number_id)
        .maybeSingle();
      reg = data;
    }

    const devicePhone = device.phone_number || body?.phone_number || null;
    if (!reg && devicePhone) {
      const target = digits(devicePhone);
      const { data: candidates } = await sb
        .from("registered_numbers")
        .select("id, phone_number, owner_name, house_number, user_number, parcel_name")
        .ilike("parcel_name", parcel_name);
      reg = (candidates || []).find((r: any) => phonesMatch(digits(r.phone_number), target)) || null;
    }

    const deviceLabel = device.name || device.model || device.device_id;
    const senderName = reg?.owner_name
      ? `${reg.owner_name} (botón BLE ${deviceLabel})`
      : `Botón BLE ${deviceLabel}`;
    const observations = `Evento BLE ${button} desde dispositivo ${deviceLabel} (${device.device_id})`;

    const lat = body?.latitude !== undefined && body?.latitude !== null ? Number(body.latitude) : null;
    const lng = body?.longitude !== undefined && body?.longitude !== null ? Number(body.longitude) : null;

    // ---- Create the alarm using the existing structure ----
    const { data: alarmRow, error: alarmErr } = await sb
      .from("alarms")
      .insert({
        alarm_type: button,
        parcel_name,
        sender_name: senderName,
        phone_number: reg?.phone_number || devicePhone || null,
        house_number: reg?.house_number || null,
        latitude: Number.isFinite(lat as number) ? lat : null,
        longitude: Number.isFinite(lng as number) ? lng : null,
        observations,
        status: "pending",
      })
      .select("id")
      .single();

    if (alarmErr || !alarmRow) {
      console.error(`[BLE] Alarm insert failed | event_id=${event_id} |`, alarmErr?.message);
      return json({ success: false, error: "alarm_insert_failed", detail: alarmErr?.message }, 500);
    }

    const alarm_id = alarmRow.id;
    await sb
      .from("ble_events")
      .update({ alarm_id })
      .eq("id", eventRow.id);

    await sb
      .from("ble_devices")
      .update({
        last_seen_at: new Date().toISOString(),
        battery: body?.battery ?? null,
        rssi: body?.rssi ?? null,
      })
      .eq("id", device.id);

    console.log(
      `[BLE] AUDIT accepted | device_id=${device.device_id} | event_id=${event_id} | button=${button} | parcel=${parcel_name} | alarm_id=${alarm_id} | pressed_at=${pressedAt?.toISOString() || "n/a"}`,
    );

    // ---- Reuse the existing SmartSOS flow (no logic duplicated here) ----
    try {
      const cmdRes = await sb.functions.invoke("send-gps-command", {
        body: { alarm_type: button, alarm_id, parcel_name },
      });
      console.log(`[BLE] send-gps-command | alarm_id=${alarm_id} |`, JSON.stringify(cmdRes.data));
    } catch (e: any) {
      console.error(`[BLE] send-gps-command error | alarm_id=${alarm_id} |`, e?.message);
    }

    try {
      const waRes = await sb.functions.invoke("send-whatsapp", {
        body: {
          alarm_type: button,
          sender_name: senderName,
          phone_number: reg?.phone_number || devicePhone || null,
          parcel_name,
          house_number: reg?.house_number || null,
          latitude: Number.isFinite(lat as number) ? lat : null,
          longitude: Number.isFinite(lng as number) ? lng : null,
        },
      });
      console.log(`[BLE] send-whatsapp | alarm_id=${alarm_id} |`, JSON.stringify(waRes.data));
    } catch (e: any) {
      console.error(`[BLE] send-whatsapp error | alarm_id=${alarm_id} |`, e?.message);
    }

    try {
      const siaRes = await sb.functions.invoke("send-sia-event", {
        body: {
          alarm_type: button,
          parcel_name,
          phone_number: reg?.phone_number || devicePhone || null,
          cra_user_number: reg?.user_number || null,
          source: "ble_button",
        },
      });
      console.log(`[BLE] send-sia-event | alarm_id=${alarm_id} |`, JSON.stringify(siaRes.data));
    } catch (e: any) {
      console.error(`[BLE] send-sia-event error | alarm_id=${alarm_id} |`, e?.message);
    }

    return json({ success: true, event_id, alarm_id, duplicate: false, parcel_name, alarm_type: button });
  } catch (err: any) {
    console.error("[BLE] Unhandled error:", err?.message);
    return json({ success: false, error: "internal_error" }, 500);
  }
});
