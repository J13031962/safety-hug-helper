import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Settings {
  senderName: string;
  phoneNumber: string;
  houseNumber: string;
  parcelName: string;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>({
    senderName: "",
    phoneNumber: "",
    houseNumber: "",
    parcelName: "",
  });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("teleguardia_settings") || "{}");
    setSettings((s) => ({ ...s, ...saved }));
  }, []);

  const handleSave = () => {
    localStorage.setItem("teleguardia_settings", JSON.stringify(settings));
    toast({ title: "Guardado", description: "Configuración guardada correctamente" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-display font-bold">Configuración</h1>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display">Datos del remitente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senderName">Nombre</Label>
              <Input
                id="senderName"
                placeholder="Tu nombre"
                value={settings.senderName}
                onChange={(e) => setSettings((s) => ({ ...s, senderName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Teléfono</Label>
              <Input
                id="phoneNumber"
                placeholder="+58 412 1234567"
                value={settings.phoneNumber}
                onChange={(e) => setSettings((s) => ({ ...s, phoneNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="houseNumber">Número de casa</Label>
              <Input
                id="houseNumber"
                placeholder="Ej: A-12"
                value={settings.houseNumber}
                onChange={(e) => setSettings((s) => ({ ...s, houseNumber: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parcelName">Parcela / Urbanización</Label>
              <Input
                id="parcelName"
                placeholder="Ej: Parcela Los Pinos"
                value={settings.parcelName}
                onChange={(e) => setSettings((s) => ({ ...s, parcelName: e.target.value }))}
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Guardar configuración
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
