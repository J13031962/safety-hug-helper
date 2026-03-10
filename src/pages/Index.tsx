import { useState, useEffect, useMemo } from "react";
import { Activity, MapPin, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmergencyGrid from "@/components/EmergencyGrid";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhoneGate from "@/components/PhoneGate";

type AlarmType = "panic" | "medical" | "fire" | "disaster";

const ADMIN_PHONE = "3332840057";

const IndexContent = () => {
  const [selectedType, setSelectedType] = useState<AlarmType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const navigate = useNavigate();

  // Read settings directly (not in useEffect) so it's always fresh
  const settings = useMemo(() => {
    return JSON.parse(localStorage.getItem("sosalerta_settings") || "{}");
  }, []);

  const userName = settings.senderName || "";
  const phoneDigits = (settings.phoneNumber || "").replace(/\D/g, "");
  const isAdmin = phoneDigits.endsWith(ADMIN_PHONE);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setGpsActive(true),
        () => setGpsActive(false)
      );
    }
  }, []);

  const handleSelect = (type: AlarmType) => {
    setSelectedType(type);
    setDialogOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("sosalerta_settings");
    window.location.reload();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emergency-panic inline-block" />
              <h1 className="text-lg font-display font-bold tracking-tight">SOS Alert</h1>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{gpsActive ? "Ubicación GPS activa" : "GPS no disponible"}</span>
              {userName && <span className="ml-2">• {userName}</span>}
            </div>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <button onClick={() => navigate("/plataforma")} className="text-muted-foreground hover:text-foreground transition-colors">
                <Activity className="w-5 h-5" />
              </button>
            )}
            <button onClick={handleLogout} className="text-muted-foreground hover:text-emergency-panic transition-colors" title="Cerrar sesión">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <p className="text-muted-foreground text-sm">Presiona un botón para enviar alerta de emergencia</p>
        <EmergencyGrid onSelect={handleSelect} />
      </main>

      <footer className="py-3 text-center">
        <p className="text-xs text-muted-foreground">Las alertas se envían vía WhatsApp y activan la sirena GPS VT08</p>
      </footer>

      <ConfirmDialog
        open={dialogOpen}
        type={selectedType}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};

const Index = () => (
  <PhoneGate>
    <IndexContent />
  </PhoneGate>
);

export default Index;
