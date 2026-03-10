import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save, Settings, Moon, Sun, Volume2, Bell } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AppSettings {
  senderName: string;
  phoneNumber: string;
  darkMode: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export default function SettingsTab() {
  const [settings, setSettings] = useState<AppSettings>({
    senderName: "",
    phoneNumber: "",
    darkMode: true,
    soundEnabled: true,
    notificationsEnabled: true,
  });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("sosalerta_settings") || "{}");
    setSettings((s) => ({ ...s, ...saved }));
  }, []);

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [settings.darkMode]);

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
      <CardContent className="space-y-6 max-w-md">
        {/* Datos por defecto */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del remitente por defecto</Label>
            <Input value={settings.senderName} onChange={(e) => setSettings((s) => ({ ...s, senderName: e.target.value }))} placeholder="Nombre" />
          </div>
          <div className="space-y-2">
            <Label>Teléfono por defecto</Label>
            <Input value={settings.phoneNumber} onChange={(e) => setSettings((s) => ({ ...s, phoneNumber: e.target.value }))} placeholder="+58 412 1234567" />
          </div>
        </div>

        {/* Preferencias */}
        <div className="space-y-4 pt-2 border-t border-border">
          <h3 className="text-sm font-medium text-muted-foreground">Preferencias</h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.darkMode ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
              <Label>Modo {settings.darkMode ? "oscuro" : "claro"}</Label>
            </div>
            <Switch checked={settings.darkMode} onCheckedChange={(v) => setSettings((s) => ({ ...s, darkMode: v }))} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <Label>Sonido</Label>
            </div>
            <Switch checked={settings.soundEnabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, soundEnabled: v }))} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <Label>Notificaciones</Label>
            </div>
            <Switch checked={settings.notificationsEnabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, notificationsEnabled: v }))} />
          </div>
        </div>

        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> Guardar configuración
        </Button>
      </CardContent>
    </Card>
  );
}
