import { useState, useEffect, useMemo, useRef } from "react";
import { Activity, MapPin, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmergencyGrid from "@/components/EmergencyGrid";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhoneGate from "@/components/PhoneGate";
import smartsosLogo from "@/assets/smartsos-logo.png";

type AlarmType = "panic" | "medical" | "fire" | "disaster";

const ADMIN_PHONE = "3332840057";

const IndexContent = () => {
  const [selectedType, setSelectedType] = useState<AlarmType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);
  const locationRef = useRef<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();

  const settings = useMemo(() => {
    return JSON.parse(localStorage.getItem("sosalerta_settings") || "{}");
  }, []);

  const userName = settings.senderName || "";
  const phoneDigits = (settings.phoneNumber || "").replace(/\D/g, "");
  const isAdmin = phoneDigits.endsWith(ADMIN_PHONE);

  // Continuously track GPS position - try high accuracy first, fallback to low accuracy
  useEffect(() => {
    if (!navigator.geolocation) return;

    let watchId: number | undefined;

    // Try high accuracy first
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        locationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsActive(true);
      },
      () => {
        // If high accuracy fails, fallback to low accuracy
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            locationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setGpsActive(true);
          },
          () => setGpsActive(false),
          { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 }
        );
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );

    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
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
              <h1 className="text-lg font-display font-bold tracking-tight">SmartSOS</h1>
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

      <main className="flex-1 flex flex-col items-center justify-start px-4 pt-10 pb-6 gap-6">
        <div className="w-full max-w-xs px-4">
          <img src={smartsosLogo} alt="SmartSOS Logo" className="w-full h-auto object-contain" />
        </div>
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
        initialLocation={locationRef.current}
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
