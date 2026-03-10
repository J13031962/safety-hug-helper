import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if admin already exists
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ message: "Admin ya existe" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: "admin@teleguardia.com",
      password: "Admin2026*",
      email_confirm: true,
      user_metadata: { full_name: "Administrador Principal" },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign admin role
    if (userData.user) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userData.user.id, role: "admin" });
    }

    return new Response(JSON.stringify({ success: true, message: "Admin creado exitosamente" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
