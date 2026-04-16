import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Radio, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface SirenDevice {
  id: string;
  imei: string;
  model: string | null;
  name: string | null;
  relay_duration: number;
  parcel_names: string[];
}

interface TestSirenDialogProps {
  open: boolean;
  onClose: () => void;
  userParcels: string[];
  userName?: string;
}

export default function TestSirenDialog({ open, onClose, userParcels, userName }: TestSirenDialogProps) {
  const [sirens, setSirens] = useState<SirenDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, "success" | "error">>({});

  useEffect(() => {
    if (!open) {
      setResults({});
      return;
    }
    fetchSirens();
  }, [open]);

  const fetchSirens = async () => {
    setLoading(true);
    // Get device_ids for user's parcels
    const { data: dpData } = await supabase
      .from("gps_device_parcels")
      .select("device_id, parcel_name")
      .in("parcel_name", userParcels);

    if (!dpData || dpData.length === 0) {
      setSirens([]);
      setLoading(false);
      return;
    }

    const deviceIds = [...new Set(dpData.map((dp) => dp.device_id))];
    const { data: devices } = await supabase
      .from("gps_devices")
      .select("id, imei, model, relay_duration, name")
      .in("id", deviceIds);

    const mapped: SirenDevice[] = (devices || []).map((d) => ({
      ...d,
      parcel_names: dpData.filter((dp) => dp.device_id === d.id).map((dp) => dp.parcel_name),
    }));

    setSirens(mapped);
    setLoading(false);
  };

  const handleActivate = async (siren: SirenDevice) => {
    setActivating(siren.id);
    try {
      // Activate physical siren via GPS command
      const { error: gpsErr } = await supabase.functions.invoke("send-gps-command", {
        body: { imei: siren.imei, action: "engineStop", mode: "test" },
      });

      if (gpsErr) {
        console.warn("[Test] GPS error:", gpsErr);
      }

      // Send SIA OP event for each parcel this siren belongs to
      for (const parcel of siren.parcel_names) {
        await supabase.functions.invoke("send-sia-event", {
          body: { alarm_type: "test", parcel_name: parcel },
        });
      }

      // Register test alarm for each parcel
      for (const parcel of siren.parcel_names) {
        await supabase.from("alarms").insert({
          alarm_type: "test",
          sender_name: userName || "Admin",
          parcel_name: parcel,
          status: "resolved",
          observations: `Prueba de sirena: ${siren.name || siren.model || siren.imei}`,
        });
      }

      setResults((r) => ({ ...r, [siren.id]: "success" }));
      const displayName = siren.name || siren.model || siren.imei;
      toast({ title: "Sirena activada", description: `${displayName} — se apagará en ${siren.relay_duration}s` });
    } catch {
      setResults((r) => ({ ...r, [siren.id]: "error" }));
      toast({ title: "Error", description: "No se pudo activar la sirena", variant: "destructive" });
    }
    setActivating(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md border-border">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Radio className="w-5 h-5" /> Prueba de Sirenas
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Selecciona una sirena para probar su funcionamiento. Se activará por la duración configurada y luego se apagará automáticamente.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sirens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No hay sirenas asociadas a tus parcelaciones.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sirens.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{s.name || `Sirena ${i + 1}`} {s.model ? `(${s.model})` : ""}</p>
                  <p className="text-xs text-muted-foreground font-mono">{s.imei}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.parcel_names.map((p) => (
                      <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {results[s.id] === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {results[s.id] === "error" && <XCircle className="w-5 h-5 text-destructive" />}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={activating !== null}
                    onClick={() => handleActivate(s)}
                    className="border-emergency-panic/40 text-emergency-panic hover:bg-emergency-panic/10"
                  >
                    {activating === s.id ? (
                      <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Activando...</>
                    ) : (
                      "Activar"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" onClick={onClose} className="w-full mt-2">Cerrar</Button>
      </DialogContent>
    </Dialog>
  );
}
