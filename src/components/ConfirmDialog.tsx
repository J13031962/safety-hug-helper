import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, MapPin, Loader2, ShieldX } from "lucide-react";
import { reverseGeocode } from "@/lib/geocode";

type AlarmType = "panic" | "medical" | "fire" | "disaster";

const alarmConfig: Record<AlarmType, { label: string; emoji: string; colorClass: string; bgClass: string }> = {
  panic: { label: "PÁNICO", emoji: "🔴", colorClass: "text-emergency-panic", bgClass: "bg-emergency-panic" },
  medical: { label: "MÉDICA", emoji: "🔵", colorClass: "text-emergency-medical", bgClass: "bg-emergency-medical" },
  fire: { label: "INCENDIO", emoji: "🟠", colorClass: "text-emergency-fire", bgClass: "bg-emergency-fire" },
  disaster: { label: "DESASTRE", emoji: "🟡", colorClass: "text-emergency-disaster", bgClass: "bg-emergency-disaster" },
};

interface ParcelInfo {
  parcelName: string;
  houseNumber: string;
  ownerName: string;
}

interface ConfirmDialogProps {
  open: boolean;
  type: AlarmType | null;
  onClose: () => void;
  initialLocation?: { lat: number; lng: number } | null;
  parcels?: ParcelInfo[];
  onParcelSelected?: (parcel: ParcelInfo) => void;
}

type DialogState = "select_parcel" | "confirm" | "sending" | "success" | "not_registered";

export default function ConfirmDialog({ open, type, onClose, initialLocation, parcels, onParcelSelected }: ConfirmDialogProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [state, setState] = useState<DialogState>("confirm");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [whatsappWarning, setWhatsappWarning] = useState<string | null>(null);

  // Check registration and get location when dialog opens
  useEffect(() => {
    if (!open) {
      setState("confirm");
      setCountdown(5);
      setLocation(null);
      setAddress(null);
      setWhatsappWarning(null);
      return;
    }

    // If multiple parcels, show selection first
    const hasMultiple = parcels && parcels.length > 1;
    if (hasMultiple) {
      setState("select_parcel");
    }

    const resolveAddress = async (lat: number, lng: number) => {
      const geo = await reverseGeocode(lat, lng);
      setAddress(geo.full);
    };

    // Use initialLocation if available
    if (initialLocation) {
      setLocation(initialLocation);
      setLocating(false);
      resolveAddress(initialLocation.lat, initialLocation.lng);
    } else {
      // Try to get location
      setLocating(true);
      if (navigator.geolocation) {
        const onSuccess = (pos: GeolocationPosition) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          setLocating(false);
          resolveAddress(loc.lat, loc.lng);
        };
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          () => {
            navigator.geolocation.getCurrentPosition(
              onSuccess,
              () => { setLocation(null); setLocating(false); },
              { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
            );
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
      } else {
        setLocating(false);
      }
    }

    // Check if user is registered
    const checkRegistration = async () => {
      const settings = JSON.parse(localStorage.getItem("sosalerta_settings") || "{}");
      const phone = settings.phoneNumber?.trim();
      
      if (!phone) {
        setState("not_registered");
        return;
      }

      const phoneDigits = phone.replace(/\D/g, "");

      const { data: allNumbers } = await supabase
        .from("registered_numbers")
        .select("id, phone_number");

      const match = allNumbers?.find((r) => {
        const registeredDigits = r.phone_number.replace(/\D/g, "");
        return registeredDigits === phoneDigits || 
               registeredDigits.endsWith(phoneDigits) || 
               phoneDigits.endsWith(registeredDigits);
      });

      if (!match) {
        setState("not_registered");
        return;
      }

      setState("confirm");
    };

    checkRegistration();
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (!open || state !== "confirm" || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, state, countdown]);

  // Auto-send when countdown reaches 0
  useEffect(() => {
    if (open && countdown === 0 && state === "confirm") {
      handleSend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const handleSend = useCallback(async () => {
    if (!type || state === "sending") return;
    setState("sending");

    const settings = JSON.parse(localStorage.getItem("sosalerta_settings") || "{}");

    const getLiveLocation = async (): Promise<{ lat: number; lng: number } | null> => {
      if (!navigator.geolocation) return null;
      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
        );
      });
    };

    let finalLocation: { lat: number; lng: number } | null = location || initialLocation || null;
    if (!finalLocation) {
      finalLocation = await getLiveLocation();
      if (finalLocation) setLocation(finalLocation);
    }

    let finalAddress = address;
    if (!finalAddress && finalLocation) {
      const geo = await reverseGeocode(finalLocation.lat, finalLocation.lng);
      finalAddress = geo.full;
      setAddress(geo.full);
    }

    const alarmId = crypto.randomUUID();

    const alarmData = {
      id: alarmId,
      alarm_type: type,
      sender_name: settings.senderName || "Usuario",
      phone_number: settings.phoneNumber || "",
      house_number: settings.houseNumber || "",
      parcel_name: settings.parcelName || "",
      latitude: finalLocation?.lat ?? null,
      longitude: finalLocation?.lng ?? null,
      address: finalAddress || null,
    };

    const { error } = await supabase
      .from("alarms")
      .insert(alarmData);

    if (error) {
      console.error("[ALARM] Insert failed:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la alerta",
        variant: "destructive",
      });
      setState("confirm");
      return;
    }

    // Try WhatsApp
    try {
      const { error: whatsErr } = await supabase.functions.invoke("send-whatsapp", { body: alarmData });
      if (whatsErr) {
        setWhatsappWarning("No se enviaron mensajes WhatsApp. Configura las API keys de CallMeBot en los números registrados.");
      }
    } catch {
      setWhatsappWarning("No se enviaron mensajes WhatsApp. Configura las API keys de CallMeBot en los números registrados.");
    }

    // Try GPS siren/relay activation
    let gpsWarning: string | null = null;
    try {
      const { data: gpsData, error: gpsErr } = await supabase.functions.invoke("send-gps-command", {
        body: {
          alarm_id: alarmId,
          alarm_type: type,
          phone_number: alarmData.phone_number,
          parcel_name: alarmData.parcel_name,
        },
      });
      if (gpsErr) {
        console.warn("[GPS] Error activando dispositivos:", gpsErr);
        gpsWarning = "No se pudo activar la sirena GPS.";
      } else if (gpsData?.success === false) {
        console.warn("[GPS] No devices found:", gpsData.reason, gpsData.message);
        if (gpsData.reason === "no_devices_for_parcel") {
          gpsWarning = `No hay dispositivos GPS registrados para "${gpsData.parcel_resolved || settings.parcelName || "tu parcela"}".`;
        } else {
          gpsWarning = gpsData.message || "No se pudo activar la sirena GPS.";
        }
      }
    } catch (gpsEx) {
      console.warn("[GPS] Error activando dispositivos:", gpsEx);
      gpsWarning = "No se pudo activar la sirena GPS.";
    }

    if (gpsWarning) {
      setWhatsappWarning((prev) => {
        const parts = [prev, `📡 ${gpsWarning}`].filter(Boolean);
        return parts.join("\n");
      });
    }

    setState("success");

    // Auto-close after 4 seconds
    setTimeout(() => {
      onClose();
    }, 4000);
  }, [type, state, location, address, initialLocation]);

  const handleClose = () => {
    onClose();
  };

  const handleParcelSelect = (parcel: ParcelInfo) => {
    // Update localStorage with the selected parcel
    const settings = JSON.parse(localStorage.getItem("sosalerta_settings") || "{}");
    const updated = {
      ...settings,
      parcelName: parcel.parcelName,
      houseNumber: parcel.houseNumber,
      senderName: parcel.ownerName,
    };
    localStorage.setItem("sosalerta_settings", JSON.stringify(updated));
    onParcelSelected?.(parcel);
    setState("confirm");
    setCountdown(5);
  };

  if (!type) return null;

  const cfg = alarmConfig[type];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && state !== "sending") handleClose(); }}>
      <DialogContent className="sm:max-w-md border-border p-0 overflow-hidden [&>button.absolute]:hidden">

        {state === "select_parcel" ? (
          /* ── Parcel Selection Screen ── */
          <div className="flex flex-col items-center gap-4 p-8">
            <div className={`w-16 h-16 rounded-full border-2 border-current flex items-center justify-center ${cfg.colorClass}`}>
              <span className="text-3xl">{cfg.emoji}</span>
            </div>
            <h2 className="text-xl font-display font-bold">Alerta de {cfg.label}</h2>
            <p className="text-sm text-muted-foreground text-center">
              Seleccione la parcelación donde se encuentra:
            </p>
            <div className="flex flex-col gap-3 w-full">
              {parcels?.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleParcelSelect(p)}
                  className={`w-full px-4 py-4 rounded-xl border-2 border-border bg-background text-foreground font-display font-bold text-base hover:border-emergency-panic/60 hover:bg-emergency-panic/10 transition-all active:scale-95`}
                >
                  {p.parcelName}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={handleClose} className="w-full mt-2">
              Cancelar
            </Button>
          </div>

        ) : state === "not_registered" ? (
          /* ── Not Registered Screen ── */
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="w-16 h-16 rounded-full border-2 border-emergency-panic/50 flex items-center justify-center">
              <ShieldX className="w-10 h-10 text-emergency-panic" />
            </div>
            <h2 className="text-xl font-display font-bold">No Registrado</h2>
            <p className="text-sm text-muted-foreground text-center">
              Su número no se encuentra registrado en el sistema. Asegúrese de configurar su número de teléfono en Configuración.
            </p>
            <div className="w-full rounded-lg border border-emergency-disaster/40 bg-emergency-disaster/10 p-3 text-xs text-emergency-disaster flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Vaya a Configuración, ingrese su número de teléfono registrado y guarde. Si su número no está registrado, contacte al administrador.</span>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cerrar
              </Button>
              <Button onClick={() => { handleClose(); navigate("/configuracion"); }} className="flex-1 bg-emergency-medical hover:bg-emergency-medical/80 text-foreground font-bold">
                Ir a Configuración
              </Button>
            </div>
          </div>

        ) : state === "success" ? (
          /* ── Success Screen ── */
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="w-16 h-16 rounded-full border-2 border-emergency-medical flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emergency-medical" />
            </div>
            <h2 className="text-xl font-display font-bold">¡Alerta Enviada!</h2>
            <p className="text-sm text-muted-foreground text-center">
              Se notificó a todos los contactos registrados.
            </p>
            {whatsappWarning && (
              <div className="w-full rounded-lg border border-emergency-disaster/40 bg-emergency-disaster/10 p-3 text-xs text-emergency-disaster flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{whatsappWarning}</span>
              </div>
            )}
            <Button variant="outline" onClick={handleClose} className="mt-2 w-full">
              Cerrar
            </Button>
          </div>

        ) : (
          /* ── Confirm / Sending Screen ── */
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full border-2 border-emergency-panic/50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-emergency-panic" />
              </div>
              {state === "confirm" && countdown > 0 && (
                <div className={`w-10 h-10 rounded-full border-2 border-emergency-panic flex items-center justify-center ${countdown <= 2 ? "animate-emergency-pulse" : ""}`}>
                  <span className="text-lg font-display font-bold text-emergency-panic">{countdown}</span>
                </div>
              )}
            </div>

            <h2 className="text-xl font-display font-bold mb-1">Confirmar Emergencia</h2>
            <p className="text-sm text-muted-foreground mb-4">Estás a punto de enviar una alerta de:</p>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{cfg.emoji}</span>
              <span className="font-display font-bold text-lg">{cfg.label}</span>
            </div>

            <div className="flex items-center gap-2 text-sm mb-4">
              {locating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Obteniendo ubicación...</span>
                </>
              ) : location ? (
                <>
                  <MapPin className="w-4 h-4 text-emergency-panic" />
                  <span className="text-muted-foreground text-xs">
                    📍 {address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">📍 Ubicación no disponible</span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-6">
              Se enviará un mensaje automático por WhatsApp a todos los contactos registrados y se activará la sirena.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={state === "sending"}
                className="flex-1 font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={state === "sending"}
                className={`flex-1 ${cfg.bgClass} hover:${cfg.bgClass}/80 text-foreground font-bold`}
              >
                {state === "sending" ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Enviando...</>
                ) : (
                  "CONFIRMAR"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
