import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Plataforma() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    if (role === "admin" || role === "director_monitoreo") {
      navigate("/admin");
    } else if (role === "operator" || role === "supervisor_central" || role === "director_monitoreo") {
      navigate("/operador");
    } else {
      // No role assigned yet - show message
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-display font-bold">Plataforma Central</h1>
        <p className="text-muted-foreground">
          {role ? `Rol: ${role}` : "No tienes un rol asignado. Contacta al administrador."}
        </p>
      </div>
    </div>
  );
}
