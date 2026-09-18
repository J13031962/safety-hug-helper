import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, Search, WifiOff } from "lucide-react";
import { db } from "@/integrations/supabase/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CommandEvent = {
  id: string;
  imei: string;
  device_name: string | null;
  parcel_name: string | null;
  action: string;
  source: string;
  status: string;
  response_message: string | null;
  requires_review: boolean;
  started_at: string;
};

const statusMeta: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Activity }> = {
  confirmed: { label: "Confirmada", variant: "default", icon: CheckCircle2 },
  accepted_unconfirmed: { label: "Sin confirmación", variant: "secondary", icon: Clock3 },
  rejected: { label: "Rechazada", variant: "destructive", icon: AlertTriangle },
  offline: { label: "Sin conexión", variant: "destructive", icon: WifiOff },
  requires_review: { label: "Requiere revisión", variant: "destructive", icon: AlertTriangle },
  pending: { label: "Pendiente", variant: "outline", icon: Clock3 },
};

function actionLabel(action: string) {
  if (action === "engineStop") return "Activar sirena";
  if (action === "engineResume") return "Apagar sirena";
  return "Diagnóstico";
}

export default function SirenStatusTab() {
  const [events, setEvents] = useState<CommandEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyIssues, setOnlyIssues] = useState(true);
  const [query, setQuery] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from("gps_command_events")
      .select("id, imei, device_name, parcel_name, action, source, status, response_message, requires_review, started_at")
      .order("started_at", { ascending: false })
      .limit(250);
    setEvents((data || []) as CommandEvent[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const visibleEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      const hasIssue = event.requires_review || ["rejected", "offline", "accepted_unconfirmed", "requires_review"].includes(event.status);
      if (onlyIssues && !hasIssue) return false;
      if (!needle) return true;
      return [event.device_name, event.imei, event.parcel_name, event.response_message]
        .some((value) => value?.toLowerCase().includes(needle));
    });
  }, [events, onlyIssues, query]);

  return (
    <Card className="border-border">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Activity className="h-5 w-5" /> Estado de sirenas
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadEvents} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por equipo, IMEI o parcelación" className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="only-gps-issues" checked={onlyIssues} onCheckedChange={(checked) => setOnlyIssues(checked === true)} />
            <Label htmlFor="only-gps-issues">Solo con problemas</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Parcelación</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último detalle</TableHead>
              <TableHead>Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleEvents.map((event) => {
              const meta = statusMeta[event.status] || statusMeta.pending;
              const StatusIcon = meta.icon;
              return (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium">{event.device_name || "GPS sin nombre"}</div>
                    <div className="font-mono text-xs text-muted-foreground">{event.imei}</div>
                  </TableCell>
                  <TableCell>{event.parcel_name || "—"}</TableCell>
                  <TableCell>{actionLabel(event.action)}</TableCell>
                  <TableCell>
                    <Badge variant={meta.variant} className="gap-1 whitespace-nowrap">
                      <StatusIcon className="h-3 w-3" /> {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal text-sm text-muted-foreground">
                    {event.response_message || "Esperando respuesta del equipo"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(event.started_at).toLocaleString("es-CO")}
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && visibleEvents.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay registros para este filtro.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}