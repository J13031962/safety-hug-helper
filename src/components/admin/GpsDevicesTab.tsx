import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Radio, Zap, ZapOff, Moon } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type GpsDevice = Tables<"gps_devices">;

export default function GpsDevicesTab() {
  const [devices, setDevices] = useState<GpsDevice[]>([]);
  const [parcels, setParcels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GpsDevice | null>(null);
  const [form, setForm] = useState({ imei: "", sim_number: "", model: "", relay_duration: "30", parcel_name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sendingCommand, setSendingCommand] = useState<string | null>(null);

  const fetchDevices = async () => {
    setLoading(true);
    const { data } = await supabase.from("gps_devices").select("*").order("created_at", { ascending: false });
    setDevices(data || []);
    setLoading(false);
  };

  const fetchParcels = async () => {
    const { data } = await supabase.from("registered_numbers").select("parcel_name");
    const unique = [...new Set((data || []).map(r => r.parcel_name).filter(Boolean))] as string[];
    setParcels(unique.sort());
  };

  useEffect(() => { fetchDevices(); fetchParcels(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ imei: "", sim_number: "", model: "", relay_duration: "30", parcel_name: "" });
    setDialogOpen(true);
  };

  const openEdit = (d: GpsDevice) => {
    setEditing(d);
    setForm({ imei: d.imei, sim_number: d.sim_number || "", model: d.model || "", relay_duration: String(d.relay_duration ?? 30), parcel_name: d.parcel_name || "" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.imei) {
      toast({ title: "Error", description: "IMEI es requerido", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = { imei: form.imei, sim_number: form.sim_number || null, model: form.model || null, relay_duration: parseInt(form.relay_duration) || 30, parcel_name: form.parcel_name || null };

    if (editing) {
      const { error } = await supabase.from("gps_devices").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Dispositivo actualizado" });
    } else {
      const { error } = await supabase.from("gps_devices").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Dispositivo registrado" });
    }
    setDialogOpen(false);
    setSubmitting(false);
    fetchDevices();
  };

  const handleDelete = async (d: GpsDevice) => {
    if (!confirm(`¿Eliminar dispositivo ${d.imei}?`)) return;
    const { error } = await supabase.from("gps_devices").delete().eq("id", d.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Eliminado" }); fetchDevices(); }
  };

  const sendCommand = async (imei: string, action: "relay-on" | "relay-off" | "nosleep") => {
    const cmdKey = `${imei}-${action}`;
    setSendingCommand(cmdKey);
    try {
      const { data, error } = await supabase.functions.invoke("send-gps-command", {
        body: { imei, action },
      });
      if (error) {
        toast({ title: "Error", description: "No se pudo enviar el comando", variant: "destructive" });
      } else if (data?.success) {
        const labels: Record<string, string> = {
          "relay-on": "⚡ Corte de energía enviado",
          "relay-off": "🔌 Restauración de energía enviada",
          "nosleep": "😴 Modo siempre activo enviado",
        };
        toast({ title: labels[action] || "Comando enviado" });
      } else {
        toast({ title: "Error", description: data?.error || "El comando falló", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    }
    setSendingCommand(null);
  };

  const isRelayActive = (d: GpsDevice) => {
    if (!d.relay_active_until) return false;
    return new Date(d.relay_active_until) > new Date();
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4 space-y-3">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Radio className="w-5 h-5" /> Dispositivos GPS
          </CardTitle>
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nuevo</Button>
        </div>
        <div className="flex flex-wrap gap-4 p-3 rounded-md bg-muted/50 border border-border text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Plataforma:</span>
            <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">Protrack VT08F</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Servidor:</span>
            <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">192.99.16.163</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Puerto:</span>
            <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">8821</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Protocolo:</span>
            <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">TCP</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Comandos:</span>
            <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">poweroff# poweron# nosleep#</code>
          </div>
          <p className="w-full text-xs text-muted-foreground">Configura estos datos en cada dispositivo Protrack VT08F para conectarlo al servidor.</p>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse">Cargando...</p>
        ) : (
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead>IMEI</TableHead>
                <TableHead>SIM</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Parcelación</TableHead>
                <TableHead>Duración Relay</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Comandos</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((d) => {
                const relayActive = isRelayActive(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm">{d.imei}</TableCell>
                    <TableCell>{d.sim_number || "—"}</TableCell>
                    <TableCell>{d.model || "—"}</TableCell>
                    <TableCell>{d.parcel_name || "—"}</TableCell>
                    <TableCell>{d.relay_duration ?? 30}s</TableCell>
                    <TableCell>
                      {relayActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emergency-panic">
                          <ZapOff className="w-3 h-3" /> Cortado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <Zap className="w-3 h-3" /> Normal
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2 border-emergency-panic/50 text-emergency-panic hover:bg-emergency-panic/10"
                          disabled={sendingCommand === `${d.imei}-relay-on`}
                          onClick={() => sendCommand(d.imei, "relay-on")}
                          title="Cortar energía (poweroff#)"
                        >
                          <ZapOff className="w-3 h-3 mr-1" />
                          Cortar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                          disabled={sendingCommand === `${d.imei}-relay-off`}
                          onClick={() => sendCommand(d.imei, "relay-off")}
                          title="Restaurar energía (poweron#)"
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Restaurar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2 border-emergency-disaster/50 text-emergency-disaster hover:bg-emergency-disaster/10"
                          disabled={sendingCommand === `${d.imei}-nosleep`}
                          onClick={() => sendCommand(d.imei, "nosleep")}
                          title="Modo siempre activo (nosleep#)"
                        >
                          <Moon className="w-3 h-3 mr-1" />
                          NoSleep
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(d)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {devices.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No hay dispositivos</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-border">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Editar dispositivo" : "Nuevo dispositivo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>IMEI</Label><Input value={form.imei} onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))} placeholder="Ej: 123456789012345" /></div>
            <div className="space-y-2"><Label>Número SIM</Label><Input value={form.sim_number} onChange={(e) => setForm((f) => ({ ...f, sim_number: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Modelo</Label><Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="Ej: VT08S" /></div>
            <div className="space-y-2">
              <Label>Parcelación</Label>
              <Select value={form.parcel_name} onValueChange={(v) => setForm((f) => ({ ...f, parcel_name: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar parcelación" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {parcels.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duración de activación (segundos)</Label>
              <Input type="number" min="5" max="300" value={form.relay_duration} onChange={(e) => setForm((f) => ({ ...f, relay_duration: e.target.value }))} placeholder="30" />
              <p className="text-xs text-muted-foreground">Tiempo que el relay permanece activo antes de restaurarse automáticamente.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
