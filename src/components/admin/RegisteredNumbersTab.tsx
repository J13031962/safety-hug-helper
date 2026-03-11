import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Phone } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type RegisteredNumber = Tables<"registered_numbers">;

export default function RegisteredNumbersTab() {
  const [numbers, setNumbers] = useState<RegisteredNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RegisteredNumber | null>(null);
  const [form, setForm] = useState({ owner_name: "", phone_number: "", house_number: "", parcel_name: "", callmebot_apikey: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("registered_numbers").select("*").order("created_at", { ascending: false });
    setNumbers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ owner_name: "", phone_number: "", house_number: "", parcel_name: "", callmebot_apikey: "" });
    setDialogOpen(true);
  };

  const openEdit = (n: RegisteredNumber) => {
    setEditing(n);
    setForm({
      owner_name: n.owner_name,
      phone_number: n.phone_number,
      house_number: n.house_number || "",
      parcel_name: n.parcel_name || "",
      callmebot_apikey: n.callmebot_apikey || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.owner_name || !form.phone_number) {
      toast({ title: "Error", description: "Nombre y teléfono son requeridos", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = {
      owner_name: form.owner_name,
      phone_number: form.phone_number,
      house_number: form.house_number || null,
      parcel_name: form.parcel_name || null,
      callmebot_apikey: form.callmebot_apikey || null,
    };

    if (editing) {
      const { error } = await supabase.from("registered_numbers").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Número actualizado" });
    } else {
      const { error } = await supabase.from("registered_numbers").insert(payload);
      if (error) {
        const isDuplicate = error.message.includes("duplicate") || error.code === "23505";
        toast({ title: "Error", description: isDuplicate ? "Este número de teléfono ya está registrado" : error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      } else toast({ title: "Número registrado" });
    }
    setDialogOpen(false);
    setSubmitting(false);
    fetch();
  };

  const handleDelete = async (n: RegisteredNumber) => {
    if (!confirm(`¿Eliminar ${n.owner_name}?`)) return;
    const { error } = await supabase.from("registered_numbers").delete().eq("id", n.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Eliminado" }); fetch(); }
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Phone className="w-5 h-5" /> Números WhatsApp
        </CardTitle>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nuevo</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse">Cargando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Casa</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {numbers.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.owner_name}</TableCell>
                  <TableCell>{n.phone_number}</TableCell>
                  <TableCell>{n.house_number || "—"}</TableCell>
                  <TableCell>{n.parcel_name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(n)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(n)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {numbers.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No hay números registrados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-border">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Editar número" : "Nuevo número"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre del residente</Label><Input value={form.owner_name} onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Teléfono WhatsApp</Label><Input value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} placeholder="+58 412 1234567" /></div>
            <div className="space-y-2"><Label>Número de casa</Label><Input value={form.house_number} onChange={(e) => setForm((f) => ({ ...f, house_number: e.target.value }))} placeholder="Ej: A-12" /></div>
            <div className="space-y-2"><Label>Parcela / Urbanización</Label><Input value={form.parcel_name} onChange={(e) => setForm((f) => ({ ...f, parcel_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>API Key CallMeBot</Label><Input value={form.callmebot_apikey} onChange={(e) => setForm((f) => ({ ...f, callmebot_apikey: e.target.value }))} /></div>
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
