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
import { Plus, Pencil, Trash2, Radio } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type GpsDevice = Tables<"gps_devices">;

export default function GpsDevicesTab() {
  const [devices, setDevices] = useState<GpsDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GpsDevice | null>(null);
  const [form, setForm] = useState({ imei: "", sim_number: "", model: "", relay_duration: "30" });
  const [submitting, setSubmitting] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    const { data } = await supabase.from("gps_devices").select("*").order("created_at", { ascending: false });
    setDevices(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDevices(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ imei: "", sim_number: "", model: "", relay_duration: "30" });
    setDialogOpen(true);
  };

  const openEdit = (d: GpsDevice) => {
    setEditing(d);
    setForm({ imei: d.imei, sim_number: d.sim_number || "", model: d.model || "", relay_duration: String((d as any).relay_duration ?? 30) });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.imei) {
      toast({ title: "Error", description: "IMEI es requerido", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = { imei: form.imei, sim_number: form.sim_number || null, model: form.model || null, relay_duration: parseInt(form.relay_duration) || 30 };

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
            <span className="text-muted-foreground">Servidor:</span>
            <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">192.99.16.163</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Puerto:</span>
            <code className="font-mono text-foreground bg-muted px-2 py-0.5 rounded">3000</code>
          </div>
          <p className="w-full text-xs text-muted-foreground">Configura esta IP y puerto en cada dispositivo GPS para que se conecte al servidor.</p>
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
                <TableHead>Duración Relay</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-sm">{d.imei}</TableCell>
                  <TableCell>{d.sim_number || "—"}</TableCell>
                  <TableCell>{d.model || "—"}</TableCell>
                  <TableCell>{(d as any).relay_duration ?? 30}s</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {devices.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No hay dispositivos</TableCell></TableRow>
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
