import { useState } from "react";
import { db } from "@/integrations/supabase/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Download, FileText, Bell, Radio, Users, Phone } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: Date | undefined;
  to: Date | undefined;
  onFromChange: (d: Date | undefined) => void;
  onToChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !from && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {from ? format(from, "dd/MM/yyyy") : "Desde"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={from} onSelect={onFromChange} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !to && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {to ? format(to, "dd/MM/yyyy") : "Hasta"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={to} onSelect={onToChange} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function generatePDF(title: string, headers: string[], rows: string[][], dateRange: string) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("TeleGuardia - Reporte", 14, 20);
  doc.setFontSize(12);
  doc.text(title, 14, 30);
  doc.setFontSize(9);
  doc.text(`Período: ${dateRange}`, 14, 37);
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 14, 43);
  doc.text(`Total registros: ${rows.length}`, 14, 49);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 55,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 38, 38] },
  });

  doc.save(`${title.replace(/\s/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`);
}

const typeLabels: Record<string, string> = {
  panic: "Pánico", medical: "Médica", fire: "Incendio", disaster: "Desastre", domestic: "Violencia Intrafamiliar",
};
const statusLabels: Record<string, string> = {
  pending: "Pendiente", processing: "En proceso", resolved: "Resuelta",
};

export default function ReportsTab() {
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);

  const dateRangeStr = `${from ? format(from, "dd/MM/yyyy") : "inicio"} - ${to ? format(to, "dd/MM/yyyy") : "hoy"}`;

  const buildDateFilter = (query: any, col: string) => {
    if (from) query = query.gte(col, from.toISOString());
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      query = query.lte(col, end.toISOString());
    }
    return query;
  };

  const downloadAlarms = async () => {
    setLoading(true);
    let query = db.from("alarms").select("*").order("created_at", { ascending: false });
    query = buildDateFilter(query, "created_at");
    const { data } = await query;

    // Fetch operator profiles for processed_by
    const operatorIds = [...new Set((data || []).map((a) => a.processed_by).filter(Boolean))] as string[];
    let operatorMap: Record<string, string> = {};
    if (operatorIds.length > 0) {
      const { data: profiles } = await db.from("profiles").select("user_id, full_name, email").in("user_id", operatorIds);
      (profiles || []).forEach((p) => { operatorMap[p.user_id] = p.full_name || p.email || "—"; });
    }

    const rows = (data || []).map((a) => [
      typeLabels[a.alarm_type] || a.alarm_type,
      a.sender_name || "—",
      a.house_number || "—",
      statusLabels[a.status] || a.status,
      a.processed_by ? (operatorMap[a.processed_by] || "—") : "—",
      new Date(a.created_at).toLocaleString("es-VE"),
      a.processed_at ? new Date(a.processed_at).toLocaleString("es-VE") : "—",
      a.observations || "—",
    ]);
    generatePDF("Reporte de Atenciones", ["Tipo", "Remitente", "Casa", "Estado", "Operador", "Hora Llegada", "Hora Atención", "Observaciones"], rows, dateRangeStr);
    setLoading(false);
  };

  const downloadGps = async () => {
    setLoading(true);
    let query = db.from("gps_devices").select("*").order("created_at", { ascending: false });
    query = buildDateFilter(query, "created_at");
    const { data } = await query;
    const rows = (data || []).map((d) => [
      d.imei,
      d.sim_number || "—",
      d.model || "—",
      new Date(d.created_at).toLocaleString("es-VE"),
    ]);
    generatePDF("Reporte de Dispositivos GPS", ["IMEI", "SIM", "Modelo", "Fecha Registro"], rows, dateRangeStr);
    setLoading(false);
  };

  const downloadUsers = async () => {
    setLoading(true);
    let query = db.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
    query = buildDateFilter(query, "created_at");
    const { data } = await query;
    const roleLabels: Record<string, string> = {
      admin: "Administrador", operator: "Operador", director_monitoreo: "Director Central", supervisor_central: "Supervisor Central",
    };
    const rows = (data || []).map((u: any) => [
      u.full_name || "—",
      u.email || "—",
      (u.user_roles || []).map((r: any) => roleLabels[r.role] || r.role).join(", ") || "Sin rol",
      new Date(u.created_at).toLocaleString("es-VE"),
    ]);
    generatePDF("Reporte de Usuarios", ["Nombre", "Email", "Rol", "Fecha Registro"], rows, dateRangeStr);
    setLoading(false);
  };

  const downloadWhatsapp = async () => {
    setLoading(true);
    let query = db.from("registered_numbers").select("*").order("created_at", { ascending: false });
    query = buildDateFilter(query, "created_at");
    const { data } = await query;
    const rows = (data || []).map((n) => [
      n.owner_name,
      n.phone_number,
      n.house_number || "—",
      n.parcel_name || "—",
      n.callmebot_apikey ? "Sí" : "No",
      new Date(n.created_at).toLocaleString("es-VE"),
    ]);
    generatePDF("Reporte de Números WhatsApp", ["Nombre", "Teléfono", "Casa", "Parcela", "API Key", "Fecha Registro"], rows, dateRangeStr);
    setLoading(false);
  };

  const reports = [
    { id: "alarms", icon: Bell, label: "Alarmas", desc: "Historial completo de alarmas con tipo, estado y observaciones", action: downloadAlarms },
    { id: "gps", icon: Radio, label: "Dispositivos GPS", desc: "Listado de dispositivos GPS registrados con IMEI y SIM", action: downloadGps },
    { id: "users", icon: Users, label: "Usuarios", desc: "Usuarios del sistema con roles asignados", action: downloadUsers },
    { id: "whatsapp", icon: Phone, label: "WhatsApp", desc: "Números registrados con nombres y parcelas", action: downloadWhatsapp },
  ];

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <FileText className="w-5 h-5" /> Reportes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Filtrar por rango de fechas (aplica a todos los reportes):</p>
          <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.id} className="border-border bg-muted/30">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emergency-panic/10 border border-emergency-panic/30 flex items-center justify-center shrink-0">
                    <r.icon className="w-5 h-5 text-emergency-panic" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={r.action} disabled={loading} className="shrink-0">
                  <Download className="w-4 h-4 mr-1" /> PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
