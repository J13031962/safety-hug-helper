import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AppSettings {
  senderName: string;
  phoneNumber: string;
  houseNumber: string;
  parcelName: string;
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<AppSettings>({
    senderName: "",
    phoneNumber: "",
    houseNumber: "",
    parcelName: "",
  });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("sosalerta_settings") || "{}");
    setSettings((s) => ({ ...s, ...saved }));
  }, []);

  const handleSave = () => {
    localStorage.setItem("sosalerta_settings", JSON.stringify(settings));
    toast({ title: "Guardado", description: "Configuración guardada correctamente" });
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Settings className="w-5 h-5" /> Configuración General
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label>Nombre del remitente por defecto</Label>
          <Input value={settings.senderName} onChange={(e) => setSettings((s) => ({ ...s, senderName: e.target.value }))} placeholder="Nombre" />
        </div>
        <div className="space-y-2">
          <Label>Teléfono por defecto</Label>
          <Input value={settings.phoneNumber} onChange={(e) => setSettings((s) => ({ ...s, phoneNumber: e.target.value }))} placeholder="+58 412 1234567" />
        </div>
        <div className="space-y-2">
          <Label>Número de casa por defecto</Label>
          <Input value={settings.houseNumber} onChange={(e) => setSettings((s) => ({ ...s, houseNumber: e.target.value }))} placeholder="Ej: A-12" />
        </div>
        <div className="space-y-2">
          <Label>Parcela / Urbanización por defecto</Label>
          <Input value={settings.parcelName} onChange={(e) => setSettings((s) => ({ ...s, parcelName: e.target.value }))} placeholder="Ej: Parcela Los Pinos" />
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> Guardar configuración
        </Button>
      </CardContent>
    </Card>
  );
}
