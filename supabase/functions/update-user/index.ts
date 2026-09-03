import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dbOptions } from "../_shared/dbSchema.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      dbOptions
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "director_monitoreo"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, email, full_name, password, role, parcel_ids } = await req.json();

    const updateData: Record<string, any> = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (full_name) updateData.user_metadata = { full_name };

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, updateData);
      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (full_name || email) {
      const profileUpdate: Record<string, string> = {};
      if (full_name) profileUpdate.full_name = full_name;
      if (email) profileUpdate.email = email;
      await supabaseAdmin.from("profiles").update(profileUpdate).eq("user_id", user_id);
    }

    if (role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      await supabaseAdmin.from("user_roles").insert({ user_id, role });
    }

    // Sync operator parcels assignments
    if (Array.isArray(parcel_ids)) {
      await supabaseAdmin.from("operator_parcels").delete().eq("user_id", user_id);
      if (parcel_ids.length > 0) {
        await supabaseAdmin
          .from("operator_parcels")
          .insert(parcel_ids.map((pid: string) => ({ user_id, parcel_id: pid })));
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
