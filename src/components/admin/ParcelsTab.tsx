import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, MapPin, MessageSquare, Search } from "lucide-react";

interface Parcel {
  id: string;
  name: string;
  whatsapp_group_id: string | null;
  whatsapp_invite_link: string | null;
  account_number: string | null;
  created_at: string;
}

export default function ParcelsTab() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Parcel | null>(null);
  const [form, setForm] = useState({ name: "", whatsapp_group_id: "", whatsapp_invite_link: "", account_number: "" });
  const [submitting, setSubmitting] = useState(false);

  // Resolve group ID dialog
  const [resolveOpen, setResolveOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<Parcel | null>(null);

  const fetchParcels = async () => {
    setLoading(true);
    const { data } = await db.from("parcels").select("*").order("name");
    setParcels((data as Parcel[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchParcels(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", whatsapp_group_id: "", whatsapp_invite_link: "", account_number: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: Parcel) => {
    setEditing(p);
    setForm({ name: p.name, whatsapp_group_id: p.whatsapp_group_id || "", whatsapp_invite_link: p.whatsapp_invite_link || "", account_number: p.account_number || "" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = {
      name: form.name.trim(),
      whatsapp_group_id: form.whatsapp_group_id.trim() || null,
      whatsapp_invite_link: form.whatsapp_invite_link.trim() || null,
      account_number: form.account_number.trim() || null,
    };

    if (editing) {
      const { error } = await db.from("parcels").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Parcela actualizada" });
    } else {
      const { error } = await db.from("parcels").insert(payload);
      if (error) {
        const isDuplicate = error.message.includes("duplicate") || error.code === "23505";
        toast({ title: "Error", description: isDuplicate ? "Ya existe una parcela con ese nombre" : error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      toast({ title: "Parcela creada" });
    }
    setDialogOpen(false);
    setSubmitting(false);
    fetchParcels();
  };

  const handleDelete = async (p: Parcel) => {
    if (!confirm(`¿Eliminar parcela "${p.name}"?`)) return;
    const { error } = await db.from("parcels").delete().eq("id", p.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Eliminada" }); fetchParcels(); }
  };

  const openResolve = (p: Parcel) => {
    setResolveTarget(p);
    setInviteCode("");
    setResolveOpen(true);
  };

  const handleResolveGroupId = async () => {
    if (!inviteCode.trim() || !resolveTarget) return;
    setResolving(true);

    // Extract code from URL if full link pasted
    let code = inviteCode.trim();
    const match = code.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
    if (match) code = match[1];

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { action: "get_group_id", invite_code: code },
      });

      if (error) throw new Error(error.message);

      if (data?.group_id) {
        // Save to parcel
        const { error: updateErr } = await db
          .from("parcels")
          .update({ whatsapp_group_id: data.group_id })
          .eq("id", resolveTarget.id);

        if (updateErr) throw new Error(updateErr.message);

        toast({
          title: "Grupo vinculado",
          description: `"${data.subject || data.group_id}" vinculado a ${resolveTarget.name}`,
        });
        setResolveOpen(false);
        fetchParcels();
      } else {
        toast({ title: "Error", description: "No se pudo obtener el Group ID. Verifica el enlace.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setResolving(false);
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <MapPin className="w-5 h-5" /> Parcelas y Grupos WhatsApp
        </CardTitle>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nueva parcela</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse">Cargando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Nº Abonado CRA</TableHead>
                <TableHead>Grupo WhatsApp ID</TableHead>
                <TableHead>Enlace de invitación</TableHead>
                <TableHead className="w-32">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcels.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    {p.account_number ? (
                      <span className="text-xs font-mono text-primary">{p.account_number}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.whatsapp_group_id ? (
                      <span className="text-xs font-mono text-primary">{p.whatsapp_group_id}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sin grupo</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.whatsapp_invite_link ? (
                      <a href={p.whatsapp_invite_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate max-w-[200px] inline-block">{p.whatsapp_invite_link}</a>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sin enlace</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Vincular grupo" onClick={() => openResolve(p)}>
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {parcels.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No hay parcelas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-border">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Editar parcela" : "Nueva parcela"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la parcela</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Hacienda San Sebastian" />
            </div>
            <div className="space-y-2">
              <Label>Número de abonado CRA (opcional)</Label>
              <Input value={form.account_number} onChange={(e) => setForm(f => ({ ...f, account_number: e.target.value }))} placeholder="Ej: 9999" className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Número de cuenta del abonado en la Central Receptora de Alarmas.</p>
            </div>
            <div className="space-y-2">
              <Label>Group ID de WhatsApp (opcional)</Label>
              <Input value={form.whatsapp_group_id} onChange={(e) => setForm(f => ({ ...f, whatsapp_group_id: e.target.value }))} placeholder="Ej: 120363407230255450@g.us" className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">Puedes obtenerlo con el botón de vincular grupo después de crear la parcela.</p>
            </div>
            <div className="space-y-2">
              <Label>Enlace de invitación WhatsApp (opcional)</Label>
              <Input value={form.whatsapp_invite_link} onChange={(e) => setForm(f => ({ ...f, whatsapp_invite_link: e.target.value }))} placeholder="https://chat.whatsapp.com/XXXXXX" className="text-sm" />
              <p className="text-xs text-muted-foreground">Este enlace aparecerá en el mensaje de alarma para que los vecinos puedan unirse al chat.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Group ID dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="sm:max-w-md border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Vincular grupo WhatsApp</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Pega el enlace de invitación del grupo de WhatsApp para <strong>{resolveTarget?.name}</strong>.
            El número vinculado a la API debe ser miembro del grupo.
          </p>
          <div className="space-y-2">
            <Label>Enlace de invitación</Label>
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="https://chat.whatsapp.com/XXXXXX"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancelar</Button>
            <Button onClick={handleResolveGroupId} disabled={resolving || !inviteCode.trim()}>
              <Search className="w-4 h-4 mr-1" />
              {resolving ? "Obteniendo..." : "Obtener Group ID"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
