import { useState } from "react";
import { Settings, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmergencyGrid from "@/components/EmergencyGrid";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";

type AlarmType = "panic" | "medical" | "fire" | "disaster";

const Index = () => {
  const [selectedType, setSelectedType] = useState<AlarmType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (type: AlarmType) => {
    setSelectedType(type);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-xl font-display font-bold tracking-tight">
          <Shield className="inline-block w-5 h-5 mr-2 text-emergency-panic" />
          TeleGuardia
        </h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracion")}>
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/plataforma")}>
            Central
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <div className="text-center mb-2">
          <h2 className="text-2xl font-display font-bold mb-1">Emergencia</h2>
          <p className="text-muted-foreground text-sm">Selecciona el tipo de alerta</p>
        </div>
        <EmergencyGrid onSelect={handleSelect} />
      </main>

      <ConfirmDialog
        open={dialogOpen}
        type={selectedType}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};

export default Index;
