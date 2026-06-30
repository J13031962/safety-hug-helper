import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole | null;
}

interface Parcel { id: string; name: string }

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  director_monitoreo: "Director Central",
  supervisor_central: "Supervisor Central",
};

export default function UsersTab() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "operator" as AppRole });
  const [submitting, setSubmitting] = useState(false);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    if (profiles) {
      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]));
      setUsers(
        profiles.map((p) => ({
          user_id: p.user_id,
          email: p.email,
          full_name: p.full_name,
          role: roleMap.get(p.user_id) ?? null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    supabase.from("parcels").select("id, name").order("name").then(({ data }) => {
      setParcels(data || []);
    });
  }, []);

  const loadOperatorParcels = async (userId: string) => {
    const { data } = await supabase.from("operator_parcels").select("parcel_id").eq("user_id", userId);
    setSelectedParcelIds((data || []).map((r: any) => r.parcel_id));
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ email: "", password: "", full_name: "", role: "operator" });
    setSelectedParcelIds([]);
    setDialogOpen(true);
  };

  const openEdit = (user: UserWithRole) => {
    setEditingUser(user);
    setForm({
      email: user.email || "",
      password: "",
      full_name: user.full_name || "",
      role: user.role || "operator",
    });
    setSelectedParcelIds([]);
    if (user.role === "operator") loadOperatorParcels(user.user_id);
    setDialogOpen(true);
  };

  const toggleParcel = (id: string) => {
    setSelectedParcelIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const parcel_ids = form.role === "operator" ? selectedParcelIds : [];
      if (editingUser) {
        const body: Record<string, any> = { user_id: editingUser.user_id, full_name: form.full_name, role: form.role, parcel_ids };
        if (form.email !== editingUser.email) body.email = form.email;
        if (form.password) body.password = form.password;

        const { data, error } = await supabase.functions.invoke("update-user", { body });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: "Usuario actualizado" });
      } else {
        if (!form.email || !form.password || !form.full_name) {
          toast({ title: "Error", description: "Todos los campos son requeridos", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke("create-user", {
          body: { email: form.email, password: form.password, full_name: form.full_name, role: form.role, parcel_ids },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: "Usuario creado" });
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleDelete = async (user: UserWithRole) => {
    if (!confirm(`¿Eliminar a ${user.full_name || user.email}?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: user.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Usuario eliminado" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Users className="w-5 h-5" /> Usuarios
        </CardTitle>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse">Cargando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role ? roleLabels[u.role] : "Sin rol"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No hay usuarios</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingUser ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{editingUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="director_monitoreo">Director Central</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="supervisor_central">Supervisor Central</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === "operator" && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label>Parcelaciones asignadas</Label>
                <p className="text-xs text-muted-foreground">
                  El operador solo verá alarmas de las parcelaciones seleccionadas.
                </p>
                <div className="max-h-48 overflow-y-auto border border-border rounded p-2 space-y-1.5">
                  {parcels.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No hay parcelaciones registradas.</p>
                  ) : (
                    parcels.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm py-1 px-1 hover:bg-muted/30 rounded">
                        <Checkbox
                          checked={selectedParcelIds.includes(p.id)}
                          onCheckedChange={() => toggleParcel(p.id)}
                        />
                        <span>{p.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {selectedParcelIds.length === 0 && (
                  <p className="text-xs text-emergency-disaster">⚠ Sin parcelaciones, el operador no verá ninguna alarma.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
