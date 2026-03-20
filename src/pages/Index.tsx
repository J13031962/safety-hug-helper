import { useState, useEffect, useMemo, useRef } from "react";
import { Activity, MapPin, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmergencyGrid from "@/components/EmergencyGrid";
import ConfirmDialog from "@/components/ConfirmDialog";
import PhoneGate from "@/components/PhoneGate";
import smartsosLogo from "@/assets/smartsos-logo.png";

type AlarmType = "panic" | "medical" | "fire" | "disaster";

interface ParcelInfo {
  parcelName: string;
  houseNumber: string;
  ownerName: string;
}

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

  const parcels: ParcelInfo[] = settings.parcels || [
    { parcelName: settings.parcelName || "", houseNumber: settings.houseNumber || "", ownerName: settings.senderName || "" },
  ];

  const [activeParcelIndex, setActiveParcelIndex] = useState(0);

  const activeParcel = parcels[activeParcelIndex] || parcels[0];
  const userName = activeParcel?.ownerName || settings.senderName || "";
  const phoneDigits = (settings.phoneNumber || "").replace(/\D/g, "");
  const isAdmin = phoneDigits.endsWith(ADMIN_PHONE);
  const hasMultipleParcels = parcels.length > 1;

  // Update localStorage when switching parcels
  const switchParcel = (index: number) => {
    setActiveParcelIndex(index);
    const p = parcels[index];
    const updated = {
      ...settings,
      parcelName: p.parcelName,
      houseNumber: p.houseNumber,
      senderName: p.ownerName,
    };
    localStorage.setItem("sosalerta_settings", JSON.stringify(updated));
  };

  // Continuously track GPS position
  useEffect(() => {
    if (!navigator.geolocation) return;

    let watchId: number | undefined;

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        locationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsActive(true);
      },
      () => {
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

      <main className="flex-1 flex flex-col items-center justify-start px-4 pt-10 pb-6 gap-4">
        <div className="w-full max-w-xs px-4">
          <img src={smartsosLogo} alt="SmartSOS Logo" className="w-full h-auto object-contain" />
        </div>

        {hasMultipleParcels && (
          <div className="text-center">
            <span className="text-xs text-muted-foreground">Parcelación activa:</span>
            <p className="text-sm font-display font-bold text-foreground">{activeParcel.parcelName}</p>
          </div>
        )}

        <p className="text-muted-foreground text-sm">Presiona un botón para enviar alerta de emergencia</p>
        <EmergencyGrid onSelect={handleSelect} />

        {hasMultipleParcels && (
          <div className="flex flex-wrap justify-center gap-2 mt-2 w-full max-w-[280px]">
            {parcels.map((p, i) =>
              i !== activeParcelIndex ? (
                <button
                  key={i}
                  onClick={() => switchParcel(i)}
                  className="flex-1 min-w-[120px] px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground font-display font-bold text-sm hover:border-emergency-panic/60 hover:bg-emergency-panic/10 transition-all active:scale-95"
                >
                  {p.parcelName}
                </button>
              ) : null
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">Las alertas se envían vía WhatsApp y activan las sirenas</p>
      </main>

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
