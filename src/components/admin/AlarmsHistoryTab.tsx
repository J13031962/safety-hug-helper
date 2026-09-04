import { useState, useEffect } from "react";
import { db } from "@/integrations/supabase/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import type { Tables } from "@/integrations/supabase/smartsos-types";

type Alarm = Tables<"alarms">;

const typeLabels: Record<string, { label: string; color: string }> = {
  panic: { label: "Pánico", color: "bg-emergency-panic" },
  medical: { label: "Médica", color: "bg-emergency-medical" },
  fire: { label: "Incendio", color: "bg-emergency-fire" },
  disaster: { label: "Desastre", color: "bg-emergency-disaster" },
  domestic: { label: "Violencia Intrafamiliar", color: "bg-emergency-domestic" },
  test: { label: "Prueba", color: "bg-muted" },
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  processing: "En proceso",
  resolved: "Resuelta",
};

export default function AlarmsHistoryTab() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlarms = async () => {
      const { data } = await db
        .from("alarms")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setAlarms(data || []);
      setLoading(false);
    };
    fetchAlarms();
  }, []);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Bell className="w-5 h-5" /> Historial de Alarmas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse">Cargando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Remitente</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Casa</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alarms.map((a) => {
                const typeInfo = typeLabels[a.alarm_type] || { label: a.alarm_type, color: "bg-muted" };
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge className={`${typeInfo.color} text-foreground border-0`}>{typeInfo.label}</Badge>
                    </TableCell>
                    <TableCell>{a.sender_name || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={(a as any).address || ""}>
                      {(a as any).address || (a.latitude && a.longitude ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : "—")}
                    </TableCell>
                    <TableCell>{a.house_number || "—"}</TableCell>
                    <TableCell>{a.parcel_name || "—"}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${a.status === "pending" ? "text-emergency-disaster" : a.status === "resolved" ? "text-green-400" : "text-emergency-medical"}`}>
                        {statusLabels[a.status] || a.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("es-VE")}
                    </TableCell>
                  </TableRow>
                );
              })}
              {alarms.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No hay alarmas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
