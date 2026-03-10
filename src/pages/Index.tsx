import { useState, useEffect } from "react";
import { Activity, MapPin, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmergencyGrid from "@/components/EmergencyGrid";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhoneGate from "@/components/PhoneGate";

type AlarmType = "panic" | "medical" | "fire" | "disaster";

const Index = () => {
  const [selectedType, setSelectedType] = useState<AlarmType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const [userName, setUserName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setGpsActive(true),
        () => setGpsActive(false)
      );
    }
    const settings = JSON.parse(localStorage.getItem("sosalerta_settings") || "{}");
    setUserName(settings.senderName || "");
    setPhoneNumber((settings.phoneNumber || "").replace(/\D/g, ""));
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
    <PhoneGate>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header */}
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
              {phoneNumber.endsWith("3332840057") && (
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

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
          <p className="text-muted-foreground text-sm">Presiona un botón para enviar alerta de emergencia</p>
          <EmergencyGrid onSelect={handleSelect} />
        </main>

        {/* Footer */}
        <footer className="py-3 text-center">
          <p className="text-xs text-muted-foreground">Las alertas se envían vía WhatsApp y activan la sirena GPS VT08</p>
        </footer>

        <ConfirmDialog
          open={dialogOpen}
          type={selectedType}
          onClose={() => setDialogOpen(false)}
        />
      </div>
    </PhoneGate>
  );
};

export default Index;
