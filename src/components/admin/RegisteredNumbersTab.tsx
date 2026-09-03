import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Phone, Shield, AlertTriangle, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type RegisteredNumber = Tables<"registered_numbers">;
type GpsDevice = Tables<"gps_devices">;

interface Parcel {
  id: string;
  name: string;
  whatsapp_group_id: string | null;
}

interface GroupedUser {
  phone_number: string;
  owner_name: string;
  house_number: string | null;
  parcels: string[];
  ids: string[];
  rows: RegisteredNumber[];
  is_parcel_admin: boolean;
}

interface PhysicalButton {
  device: GpsDevice;
  parcel_name: string;
}

export default function RegisteredNumbersTab() {
  const [numbers, setNumbers] = useState<RegisteredNumber[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [devices, setDevices] = useState<GpsDevice[]>([]);
  const [devicesParcels, setDevicesParcels] = useState<{ device_id: string; parcel_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [form, setForm] = useState({ owner_name: "", phone_number: "", house_number: "", parcel_names: [] as string[], user_numbers: {} as Record<string, string>, is_parcel_admin: false });
  const [submitting, setSubmitting] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [renaming, setRenaming] = useState(false);

  // Local edits for cra_user_number per device
  const [craEdits, setCraEdits] = useState<Record<string, string>>({});
  const [savingCra, setSavingCra] = useState<string | null>(null);

  const uniqueParcels = useMemo(() => {
    const fromNumbers = numbers.map((n) => n.parcel_name).filter(Boolean) as string[];
    const fromParcelsTable = parcels.map((p) => p.name);
    return [...new Set([...fromNumbers, ...fromParcelsTable])].sort();
  }, [numbers, parcels]);

  // Group users by phone (one entry per person, with all their parcels)
  const groupedUsers = useMemo(() => {
    const map = new Map<string, GroupedUser>();
    for (const n of numbers) {
      const key = n.phone_number.replace(/\D/g, "");
      if (map.has(key)) {
        const g = map.get(key)!;
        if (n.parcel_name && !g.parcels.includes(n.parcel_name)) g.parcels.push(n.parcel_name);
        g.ids.push(n.id);
        g.rows.push(n);
        if (n.is_parcel_admin) g.is_parcel_admin = true;
      } else {
        map.set(key, {
          phone_number: n.phone_number,
          owner_name: n.owner_name,
          house_number: n.house_number,
          parcels: n.parcel_name ? [n.parcel_name] : [],
          ids: [n.id],
          rows: [n],
          is_parcel_admin: !!n.is_parcel_admin,
        });
      }
    }
    return Array.from(map.values());
  }, [numbers]);

  // Physical buttons enabled, by parcel
  const physicalButtonsByParcel = useMemo(() => {
    const map = new Map<string, PhysicalButton[]>();
    const enabledDevices = devices.filter((d) => d.panic_button_enabled);
    for (const dp of devicesParcels) {
      const dev = enabledDevices.find((d) => d.id === dp.device_id);
      if (!dev) continue;
      if (!map.has(dp.parcel_name)) map.set(dp.parcel_name, []);
      map.get(dp.parcel_name)!.push({ device: dev, parcel_name: dp.parcel_name });
    }
    return map;
  }, [devices, devicesParcels]);

  // Build per-parcel groups
  const usersByParcel = useMemo(() => {
    const map = new Map<string, GroupedUser[]>();
    for (const u of groupedUsers) {
      for (const p of u.parcels) {
        if (!map.has(p)) map.set(p, []);
        map.get(p)!.push(u);
      }
    }
    return map;
  }, [groupedUsers]);

  const fetchData = async () => {
    setLoading(true);
    const [numbersRes, parcelsRes, devicesRes, dpRes] = await Promise.all([
      db.from("registered_numbers").select("*").order("created_at", { ascending: false }),
      db.from("parcels").select("id, name, whatsapp_group_id").order("name"),
      db.from("gps_devices").select("*"),
      db.from("gps_device_parcels").select("device_id, parcel_name"),
    ]);
    setNumbers(numbersRes.data || []);
    setParcels((parcelsRes.data as Parcel[]) || []);
    setDevices(devicesRes.data || []);
    setDevicesParcels(dpRes.data || []);
    // seed CRA edits
    const seed: Record<string, string> = {};
    (devicesRes.data || []).forEach((d: any) => {
      seed[d.id] = d.cra_user_number || "";
    });
    setCraEdits(seed);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingPhone(null);
    setForm({ owner_name: "", phone_number: "", house_number: "", parcel_names: [], user_numbers: {}, is_parcel_admin: false });
    setDialogOpen(true);
  };

  const openEdit = (g: GroupedUser) => {
    setEditingPhone(g.phone_number.replace(/\D/g, ""));
    const userNums: Record<string, string> = {};
    for (const r of g.rows) {
      if (r.parcel_name && (r as any).user_number) {
        userNums[r.parcel_name] = (r as any).user_number;
      }
    }
    setForm({
      owner_name: g.owner_name,
      phone_number: g.phone_number,
      house_number: g.house_number || "",
      parcel_names: [...g.parcels],
      user_numbers: userNums,
      is_parcel_admin: g.is_parcel_admin,
    });
    setDialogOpen(true);
  };

  const toggleParcel = (name: string) => {
    setForm((f) => ({
      ...f,
      parcel_names: f.parcel_names.includes(name)
        ? f.parcel_names.filter((p) => p !== name)
        : [...f.parcel_names, name],
    }));
  };

  const handleSubmit = async () => {
    if (!form.owner_name || !form.phone_number) {
      toast({ title: "Error", description: "Nombre y teléfono son requeridos", variant: "destructive" });
      return;
    }
    if (form.parcel_names.length === 0) {
      toast({ title: "Error", description: "Selecciona al menos una parcelación", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      if (editingPhone) {
        const existing = groupedUsers.find((g) => g.phone_number.replace(/\D/g, "") === editingPhone);
        if (existing) {
          for (const id of existing.ids) {
            await db.from("registered_numbers").delete().eq("id", id);
          }
        }
      }

      const rows = form.parcel_names.map((parcel_name) => ({
        owner_name: form.owner_name,
        phone_number: form.phone_number,
        house_number: form.house_number || null,
        parcel_name,
        user_number: form.user_numbers[parcel_name]?.trim() || null,
        is_parcel_admin: form.is_parcel_admin,
      }));

      const { error } = await db.from("registered_numbers").insert(rows);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }

      toast({ title: editingPhone ? "Número actualizado" : "Número registrado" });
      setDialogOpen(false);
      fetchData();
    } catch {
      toast({ title: "Error", description: "Error al guardar", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleDelete = async (g: GroupedUser) => {
    if (!confirm(`¿Eliminar ${g.owner_name}?`)) return;
    for (const id of g.ids) {
      await db.from("registered_numbers").delete().eq("id", id);
    }
    toast({ title: "Eliminado" });
    fetchData();
  };

  const handleRenameParcel = async () => {
    if (!renameFrom || !renameTo.trim()) {
      toast({ title: "Error", description: "Selecciona una parcela y escribe el nuevo nombre", variant: "destructive" });
      return;
    }
    setRenaming(true);
    const { error } = await db
      .from("registered_numbers")
      .update({ parcel_name: renameTo.trim() })
      .eq("parcel_name", renameFrom);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Parcela renombrada" });
      setRenameOpen(false);
      fetchData();
    }
    setRenaming(false);
  };

  const handleSaveCra = async (deviceId: string) => {
    setSavingCra(deviceId);
    const value = craEdits[deviceId]?.trim() || null;
    const { error } = await db
      .from("gps_devices")
      .update({ cra_user_number: value })
      .eq("id", deviceId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Nº CRA actualizado" });
      fetchData();
    }
    setSavingCra(null);
  };

  // List of parcels to render in accordion: union of (parcels with users) + (parcels with physical buttons)
  const allParcels = useMemo(() => {
    const set = new Set<string>([...usersByParcel.keys(), ...physicalButtonsByParcel.keys()]);
    return Array.from(set).sort();
  }, [usersByParcel, physicalButtonsByParcel]);

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Phone className="w-5 h-5" /> Números WhatsApp
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setRenameFrom(""); setRenameTo(""); setRenameOpen(true); }}>
            <Pencil className="w-4 h-4 mr-1" /> Renombrar parcela
          </Button>
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nuevo</Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse">Cargando...</p>
        ) : allParcels.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No hay parcelaciones ni números registrados.</p>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {allParcels.map((parcel) => {
              const users = usersByParcel.get(parcel) || [];
              const buttons = physicalButtonsByParcel.get(parcel) || [];
              const hasGroup = parcels.find((p) => p.name === parcel)?.whatsapp_group_id;
              return (
                <AccordionItem key={parcel} value={parcel} className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-display font-semibold text-base">{parcel}</span>
                      <Badge variant="secondary" className="text-xs">
                        {users.length} {users.length === 1 ? "persona" : "personas"}
                      </Badge>
                      {buttons.length > 0 && (
                        <Badge className="text-xs bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {buttons.length} botón{buttons.length === 1 ? "" : "es"} físico{buttons.length === 1 ? "" : "s"}
                        </Badge>
                      )}
                      {hasGroup && (
                        <Badge variant="outline" className="text-xs">✅ Grupo WA</Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {users.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Casa</TableHead>
                            <TableHead>Otras parcelaciones</TableHead>
                            <TableHead className="w-24">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((u) => {
                            const otherParcels = u.parcels.filter((p) => p !== parcel);
                            return (
                              <TableRow key={`${parcel}-${u.ids[0]}`}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {u.owner_name}
                                    {u.is_parcel_admin && (
                                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emergency-medical/20 text-emergency-medical font-medium">
                                        <Shield className="w-3 h-3" /> Admin
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{u.phone_number}</TableCell>
                                <TableCell>{u.house_number || "—"}</TableCell>
                                <TableCell>
                                  {otherParcels.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {otherParcels.map((p) => (
                                        <span key={p} className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                    {users.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">No hay personas registradas en esta parcelación.</p>
                    )}

                    {buttons.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Botones físicos (sirenas)
                        </div>
                        {buttons.map(({ device }) => (
                          <div
                            key={`btn-${device.id}-${parcel}`}
                            className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
                          >
                            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">
                                Botón físico — {device.name || device.model || device.imei}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono truncate">
                                IMEI: {device.imei}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Label className="text-xs whitespace-nowrap">Nº CRA:</Label>
                              <Input
                                value={craEdits[device.id] ?? ""}
                                onChange={(e) =>
                                  setCraEdits((prev) => ({ ...prev, [device.id]: e.target.value }))
                                }
                                placeholder="ej: 099"
                                className="h-8 w-24 text-xs font-mono"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSaveCra(device.id)}
                                disabled={savingCra === device.id || (craEdits[device.id] || "") === (device.cra_user_number || "")}
                              >
                                <Save className="w-3 h-3 mr-1" />
                                {savingCra === device.id ? "..." : "Guardar"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-border">
          <DialogHeader><DialogTitle className="font-display">{editingPhone ? "Editar número" : "Nuevo número"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre del residente</Label><Input value={form.owner_name} onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Teléfono WhatsApp</Label><Input value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} placeholder="+58 412 1234567" /></div>
            <div className="space-y-2"><Label>Número de casa</Label><Input value={form.house_number} onChange={(e) => setForm((f) => ({ ...f, house_number: e.target.value }))} placeholder="Ej: A-12" /></div>
            
            <div className="space-y-2">
              <Label>Parcelaciones</Label>
              {uniqueParcels.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border p-2 space-y-1">
                  {uniqueParcels.map((p) => (
                    <div key={p} className="space-y-1">
                      <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer transition-colors">
                        <Checkbox
                          checked={form.parcel_names.includes(p)}
                          onCheckedChange={() => toggleParcel(p)}
                        />
                        <span className="text-sm">{p}</span>
                        {parcels.find((px) => px.name === p)?.whatsapp_group_id && (
                          <span className="text-xs text-muted-foreground ml-auto">✅ Grupo WA</span>
                        )}
                      </label>
                      {form.parcel_names.includes(p) && (
                        <div className="ml-8 mb-1">
                          <Input
                            value={form.user_numbers[p] || ""}
                            onChange={(e) => setForm(f => ({ ...f, user_numbers: { ...f.user_numbers, [p]: e.target.value } }))}
                            placeholder="Nº usuario/zona CRA (ej: 001)"
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No hay parcelaciones creadas. Créalas en la pestaña Parcelas.</p>
              )}
              {form.parcel_names.length > 0 && (
                <p className="text-xs text-muted-foreground">{form.parcel_names.length} parcelación(es) seleccionada(s)</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emergency-medical" />
                  Admin de parcelación
                </Label>
                <p className="text-xs text-muted-foreground">Permite probar sirenas individualmente</p>
              </div>
              <Switch
                checked={form.is_parcel_admin}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_parcel_admin: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md border-border">
          <DialogHeader><DialogTitle className="font-display">Renombrar parcela</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Selecciona una parcela existente y escribe el nuevo nombre.</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Parcela actual</Label>
              <select
                value={renameFrom}
                onChange={(e) => setRenameFrom(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Seleccionar parcela...</option>
                {uniqueParcels.map((p) => (
                  <option key={p} value={p}>{p} ({numbers.filter((n) => n.parcel_name === p).length} registros)</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nuevo nombre</Label>
              <Input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder="Nuevo nombre de parcela" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
            <Button onClick={handleRenameParcel} disabled={renaming || !renameFrom || !renameTo.trim()}>
              {renaming ? "Renombrando..." : "Renombrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
