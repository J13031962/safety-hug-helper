import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Radio, AlertTriangle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type GpsDevice = Tables<"gps_devices">;

interface DeviceWithParcels extends GpsDevice {
  parcel_names: string[];
}

export default function GpsDevicesTab() {
  const [devices, setDevices] = useState<DeviceWithParcels[]>([]);
  const [parcels, setParcels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceWithParcels | null>(null);
  const [form, setForm] = useState({ imei: "", sim_number: "", model: "", relay_duration: "30", name: "", parcel_names: [] as string[], panic_button_enabled: false });
  const [submitting, setSubmitting] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    const [devRes, dpRes] = await Promise.all([
      supabase.from("gps_devices").select("*").order("created_at", { ascending: false }),
      supabase.from("gps_device_parcels").select("device_id, parcel_name"),
    ]);
    const devs = devRes.data || [];
    const dps = dpRes.data || [];
    const mapped: DeviceWithParcels[] = devs.map((d) => ({
      ...d,
      parcel_names: dps.filter((dp) => dp.device_id === d.id).map((dp) => dp.parcel_name),
    }));
    setDevices(mapped);
    setLoading(false);
  };

  const fetchParcels = async () => {
    const { data } = await supabase.from("parcels").select("name").order("name");
    setParcels((data || []).map((p) => p.name));
  };

  useEffect(() => { fetchDevices(); fetchParcels(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ imei: "", sim_number: "", model: "", relay_duration: "30", name: "", parcel_names: [], panic_button_enabled: false });
    setDialogOpen(true);
  };

  const openEdit = (d: DeviceWithParcels) => {
    setEditing(d);
    setForm({ imei: d.imei, sim_number: d.sim_number || "", model: d.model || "", relay_duration: String(d.relay_duration ?? 30), name: (d as any).name || "", parcel_names: [...d.parcel_names], panic_button_enabled: !!(d as any).panic_button_enabled });
    setDialogOpen(true);
  };

  const toggleParcel = (name: string) => {
    setForm((f) => ({
      ...f,
      parcel_names: f.parcel_names.includes(name) ? f.parcel_names.filter((p) => p !== name) : [...f.parcel_names, name],
    }));
  };

  const handleSubmit = async () => {
    if (!form.imei) {
      toast({ title: "Error", description: "IMEI es requerido", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = { imei: form.imei, sim_number: form.sim_number || null, model: form.model || null, relay_duration: parseInt(form.relay_duration) || 30, name: form.name || null, panic_button_enabled: form.panic_button_enabled };

    let deviceId: string;

    if (editing) {
      const { error } = await supabase.from("gps_devices").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSubmitting(false); return; }
      deviceId = editing.id;
      // Delete old parcel links
      await supabase.from("gps_device_parcels").delete().eq("device_id", deviceId);
    } else {
      const { data, error } = await supabase.from("gps_devices").insert(payload).select("id").single();
      if (error || !data) { toast({ title: "Error", description: error?.message || "Error al crear", variant: "destructive" }); setSubmitting(false); return; }
      deviceId = data.id;
    }

    // Insert parcel links
    if (form.parcel_names.length > 0) {
      const rows = form.parcel_names.map((parcel_name) => ({ device_id: deviceId, parcel_name }));
      await supabase.from("gps_device_parcels").insert(rows);
    }

    toast({ title: editing ? "Dispositivo actualizado" : "Dispositivo registrado" });
    setDialogOpen(false);
    setSubmitting(false);
    fetchDevices();
  };

  const handleDelete = async (d: DeviceWithParcels) => {
    if (!confirm(`¿Eliminar dispositivo ${d.imei}?`)) return;
    const { error } = await supabase.from("gps_devices").delete().eq("id", d.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Eliminado" }); fetchDevices(); }
  };

  const togglePanicButton = async (d: DeviceWithParcels, next: boolean) => {
    // Optimistic
    setDevices((prev) => prev.map((x) => x.id === d.id ? { ...x, panic_button_enabled: next } as DeviceWithParcels : x));
    const { error } = await supabase.from("gps_devices").update({ panic_button_enabled: next }).eq("id", d.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      fetchDevices();
      return;
    }
    toast({ title: next ? "Botón físico ACTIVADO" : "Botón físico desactivado", description: d.name || d.imei });
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
            <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">gps.smarturban.co</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Puerto:</span>
            <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">8822</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Protocolo:</span>
            <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">TCP</code>
          </div>
          <p className="w-full text-xs text-muted-foreground">Al activarse cualquier alarma, se envía automáticamente el comando de corte de energía (poweroff#) a los dispositivos de la parcela. Tras la duración configurada, se restaura automáticamente (poweron#).</p>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse">Cargando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>SIM</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Parcelaciones</TableHead>
                <TableHead>Duración Relay</TableHead>
                <TableHead>Botón físico</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{(d as any).name || <span className="text-muted-foreground">—</span>}</span>
                      {(d as any).panic_button_enabled && (
                        <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0">
                          <AlertTriangle className="w-3 h-3" /> SOS
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{d.imei}</TableCell>
                  <TableCell>{d.sim_number || "—"}</TableCell>
                  <TableCell>{d.model || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {d.parcel_names.length > 0 ? d.parcel_names.map((p) => (
                        <span key={p} className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{p}</span>
                      )) : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>{d.relay_duration ?? 30}s</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!(d as any).panic_button_enabled}
                        onCheckedChange={(v) => togglePanicButton(d, v)}
                      />
                      <span className={`text-xs ${(d as any).panic_button_enabled ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {(d as any).panic_button_enabled ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
            <div className="space-y-2"><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej: Sirena Entrada Principal" /></div>
            <div className="space-y-2"><Label>IMEI</Label><Input value={form.imei} onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))} placeholder="Ej: 123456789012345" /></div>
            <div className="space-y-2"><Label>Número SIM</Label><Input value={form.sim_number} onChange={(e) => setForm((f) => ({ ...f, sim_number: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Modelo</Label><Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="Ej: VT08S" /></div>
            <div className="space-y-2">
              <Label>Parcelaciones</Label>
              {parcels.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border p-2 space-y-1">
                  {parcels.map((p) => (
                    <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer transition-colors">
                      <Checkbox checked={form.parcel_names.includes(p)} onCheckedChange={() => toggleParcel(p)} />
                      <span className="text-sm">{p}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No hay parcelaciones. Créalas en la pestaña Parcelas.</p>
              )}
              {form.parcel_names.length > 0 && (
                <p className="text-xs text-muted-foreground">{form.parcel_names.length} parcelación(es) seleccionada(s)</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Duración de activación (segundos)</Label>
              <Input type="number" min="5" max="300" value={form.relay_duration} onChange={(e) => setForm((f) => ({ ...f, relay_duration: e.target.value }))} placeholder="30" />
              <p className="text-xs text-muted-foreground">Tiempo que la sirena suena antes de apagarse automáticamente.</p>
            </div>
            <div className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Permitir botón físico de pánico (SOS)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Si está desactivado, presionar el SOS en este GPS NO disparará alarma.
                </p>
              </div>
              <Switch
                checked={form.panic_button_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, panic_button_enabled: v }))}
              />
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
