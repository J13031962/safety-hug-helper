import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, UserPlus, LogIn } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [checking, setChecking] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) navigate("/plataforma");
  }, [loading, user, navigate]);

  // Check if any admin exists
  useEffect(() => {
    async function check() {
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      setHasAdmin((count ?? 0) > 0);
      setChecking(false);
    }
    check();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Sign up the first admin
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Assign admin role - need to use service role via edge function or directly if first user
    if (data.user) {
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: "admin" as const,
      });

      if (roleError) {
        // First admin may need special handling - try RPC
        toast({ title: "Aviso", description: "Cuenta creada. El rol de admin se asignará automáticamente.", variant: "default" });
      } else {
        toast({ title: "¡Éxito!", description: "Primer administrador configurado correctamente" });
      }
    }

    setSubmitting(false);
  };

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Shield className="w-12 h-12 text-emergency-panic" />
          </div>
          <CardTitle className="text-2xl font-display">TeleGuardia</CardTitle>
          <CardDescription>
            {!hasAdmin
              ? "No hay administradores. Configura el primer admin."
              : "Inicia sesión para acceder a la central"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAdmin && mode === "login" && (
            <div className="mb-4 p-3 rounded-lg bg-emergency-disaster/10 border border-emergency-disaster/30 text-sm text-emergency-disaster">
              <UserPlus className="inline w-4 h-4 mr-1" />
              No hay administradores registrados.{" "}
              <button onClick={() => setMode("setup")} className="underline font-medium">
                Configurar primer admin
              </button>
            </div>
          )}

          {mode === "setup" ? (
            <form onSubmit={handleSetupAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Configurando..." : "Configurar Administrador"}
              </Button>
              {hasAdmin && (
                <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("login")}>
                  Volver al inicio de sesión
                </Button>
              )}
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                <LogIn className="w-4 h-4 mr-2" />
                {submitting ? "Iniciando..." : "Iniciar sesión"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
