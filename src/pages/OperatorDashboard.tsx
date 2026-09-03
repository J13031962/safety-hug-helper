import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { db, DB_SCHEMA } from "@/integrations/supabase/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { LogOut, ArrowLeft, Headphones, MapPin, Clock, CheckCircle, AlertTriangle, Search, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import AlarmTimer from "@/components/AlarmTimer";
import type { Tables } from "@/integrations/supabase/types";

type Alarm = Tables<"alarms">;

const typeConfig: Record<string, { label: string; emoji: string; color: string; border: string }> = {
  panic: { label: "PÁNICO", emoji: "🚨", color: "bg-emergency-panic", border: "border-emergency-panic/40" },
  medical: { label: "MÉDICA", emoji: "🏥", color: "bg-emergency-medical", border: "border-emergency-medical/40" },
  fire: { label: "INCENDIO", emoji: "🔥", color: "bg-emergency-fire", border: "border-emergency-fire/40" },
  disaster: { label: "DESASTRE", emoji: "⚠️", color: "bg-emergency-disaster", border: "border-emergency-disaster/40" },
  domestic: { label: "VIOLENCIA INTRAFAMILIAR", emoji: "🟢", color: "bg-emergency-domestic", border: "border-emergency-domestic/40" },
  test: { label: "PRUEBA", emoji: "🔔", color: "bg-muted", border: "border-muted-foreground/40" },
};

export default function OperatorDashboard() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);
  const [observations, setObservations] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [operatorMap, setOperatorMap] = useState<Record<string, string>>({});
  const [filterSender, setFilterSender] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterOperator, setFilterOperator] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterParcel, setFilterParcel] = useState("");

  useEffect(() => {
    if (!loading && (!user || !role)) {
      navigate("/login");
    }
  }, [loading, user, role, navigate]);

  // Request browser notification permission once
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Fetch operator profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await db.from("profiles").select("user_id, full_name, email");
      const map: Record<string, string> = {};
      (data || []).forEach((p) => { map[p.user_id] = p.full_name || p.email || "—"; });
      setOperatorMap(map);
    };
    fetchProfiles();
  }, []);

  // Fetch alarms
  useEffect(() => {
    const fetchAlarms = async () => {
      const { data } = await supabase
        .from("alarms")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setAlarms(data || []);
    };
    fetchAlarms();

    // Realtime subscription
    const channel = db
      .channel("alarms-realtime")
      .on("postgres_changes", { event: "*", schema: DB_SCHEMA, table: "alarms" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setAlarms((prev) => [payload.new as Alarm, ...prev]);
          // Speak alarm type
          const newAlarm = payload.new as Alarm;
          const voiceLabels: Record<string, string> = {
            panic: "¡Alerta de pánico!",
            medical: "¡Alerta médica!",
            fire: "¡Alerta de incendio!",
            disaster: "¡Alerta de desastre!",
            domestic: "¡Alerta de violencia intrafamiliar!",
          };
          const typeName = (typeConfig[newAlarm.alarm_type]?.label) || "ALERTA";
          // Web notification (works even with tab in background)
          try {
            if ("Notification" in window && Notification.permission === "granted") {
              const body = [
                newAlarm.sender_name ? `De: ${newAlarm.sender_name}` : null,
                newAlarm.parcel_name ? `Parcela: ${newAlarm.parcel_name}` : null,
                newAlarm.house_number ? `Casa: ${newAlarm.house_number}` : null,
              ].filter(Boolean).join(" · ");
              const n = new Notification(`🚨 Nueva alerta: ${typeName}`, {
                body: body || "Nueva alarma recibida",
                tag: newAlarm.id,
                requireInteraction: true,
                icon: "/favicon.ico",
              });
              n.onclick = () => { window.focus(); n.close(); };
            }
          } catch {}
          try {
            const siren = new Audio("/sounds/police-siren.mp3");
            siren.volume = 1;
            siren.play().catch(() => {});
            setTimeout(() => {
              siren.pause();
              const msg = new SpeechSynthesisUtterance(voiceLabels[newAlarm.alarm_type] || "¡Nueva alerta!");
              msg.lang = "es-ES";
              msg.rate = 0.9;
              msg.volume = 1;
              speechSynthesis.speak(msg);
            }, 4000);
          } catch {}
        } else if (payload.eventType === "UPDATE") {
          setAlarms((prev) => prev.map((a) => (a.id === (payload.new as Alarm).id ? (payload.new as Alarm) : a)));
        }
      })
      .subscribe();

    return () => { db.removeChannel(channel); };
  }, []);

  const handleProcess = async (alarm: Alarm, newStatus: string) => {
    if (newStatus === "resolved" && !observations.trim()) {
      toast({ title: "Observación requerida", description: "Debe escribir una observación para resolver la alarma.", variant: "destructive" });
      return;
    }
    setProcessing(true);
    const updateData: Record<string, any> = {
      status: newStatus,
      processed_by: user?.id,
    };
    if (newStatus === "resolved") {
      updateData.processed_at = new Date().toISOString();
      updateData.observations = observations.trim();
    }

    const { error } = await db.from("alarms").update(updateData).eq("id", alarm.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newStatus === "processing" ? "Alarma en proceso" : "Alarma resuelta" });
      setSelectedAlarm(null);
      setObservations("");
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user || !role) return null;

  const pendingAlarms = alarms.filter((a) => a.status === "pending");
  const processingAlarms = alarms.filter((a) => a.status === "processing");
  const resolvedAlarms = alarms.filter((a) => a.status === "resolved");

  const filteredAlarms = (() => {
    let result = statusFilter ? alarms.filter((a) => a.status === statusFilter) : alarms;
    if (statusFilter === "resolved") {
      if (filterSender.trim()) {
        result = result.filter((a) => a.sender_name?.toLowerCase().includes(filterSender.toLowerCase()));
      }
      if (filterPhone.trim()) {
        result = result.filter((a) => a.phone_number?.includes(filterPhone));
      }
      if (filterOperator.trim()) {
        result = result.filter((a) => {
          const opName = a.processed_by ? operatorMap[a.processed_by] : "";
          return opName?.toLowerCase().includes(filterOperator.toLowerCase());
        });
      }
      if (filterParcel.trim()) {
        result = result.filter((a) => a.parcel_name?.toLowerCase().includes(filterParcel.toLowerCase()));
      }
      if (filterDateFrom) {
        const from = new Date(filterDateFrom);
        result = result.filter((a) => new Date(a.created_at) >= from);
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo + "T23:59:59");
        result = result.filter((a) => new Date(a.created_at) <= to);
      }
    }
    return result;
  })();

  const roleLabel = role === "director_monitoreo" ? "Director Central" : role === "operator" ? "Operador" : role === "supervisor_central" ? "Supervisor" : "Admin";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emergency-medical/10 border border-emergency-medical/30 flex items-center justify-center">
                <Headphones className="w-4 h-4 text-emergency-medical" />
              </div>
              <div>
                <h1 className="text-lg font-display font-bold">Central de Monitoreo</h1>
                <p className="text-xs text-muted-foreground">{roleLabel} — {user.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pendingAlarms.length > 0 && (
              <Badge className="bg-emergency-panic text-foreground border-0 animate-emergency-pulse">
                {pendingAlarms.length} pendiente{pendingAlarms.length > 1 ? "s" : ""}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/login"); }}>
              <LogOut className="w-4 h-4 mr-1" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card
            className={`border-emergency-panic/30 cursor-pointer transition-all ${statusFilter === "pending" ? "ring-2 ring-emergency-panic" : "hover:bg-muted/30"}`}
            onClick={() => setStatusFilter(statusFilter === "pending" ? null : "pending")}
          >
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-emergency-panic mx-auto mb-1" />
              <div className="text-2xl font-display font-bold text-emergency-panic">{pendingAlarms.length}</div>
              <div className="text-xs text-muted-foreground">Pendientes</div>
            </CardContent>
          </Card>
          <Card
            className={`border-emergency-medical/30 cursor-pointer transition-all ${statusFilter === "processing" ? "ring-2 ring-emergency-medical" : "hover:bg-muted/30"}`}
            onClick={() => setStatusFilter(statusFilter === "processing" ? null : "processing")}
          >
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 text-emergency-medical mx-auto mb-1" />
              <div className="text-2xl font-display font-bold text-emergency-medical">{processingAlarms.length}</div>
              <div className="text-xs text-muted-foreground">En proceso</div>
            </CardContent>
          </Card>
          <Card
            className={`border-green-500/30 cursor-pointer transition-all ${statusFilter === "resolved" ? "ring-2 ring-green-500" : "hover:bg-muted/30"}`}
            onClick={() => setStatusFilter(statusFilter === "resolved" ? null : "resolved")}
          >
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className="text-2xl font-display font-bold text-green-400">{resolvedAlarms.length}</div>
              <div className="text-xs text-muted-foreground">Resueltas</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters for resolved */}
        {statusFilter === "resolved" && (
          <Card className="border-border mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                <Search className="w-4 h-4" /> Filtros
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Input
                  placeholder="Remitente..."
                  value={filterSender}
                  onChange={(e) => setFilterSender(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Teléfono..."
                  value={filterPhone}
                  onChange={(e) => setFilterPhone(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Operador..."
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Parcela..."
                  value={filterParcel}
                  onChange={(e) => setFilterParcel(e.target.value)}
                  className="h-8 text-xs"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 justify-start font-normal">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {filterDateFrom || filterDateTo
                        ? `${filterDateFrom ? new Date(filterDateFrom + "T12:00").toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit" }) : "..."} — ${filterDateTo ? new Date(filterDateTo + "T12:00").toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit" }) : "..."}`
                        : "Fechas"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="end">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Desde</Label>
                        <Input
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Hasta</Label>
                        <Input
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      {(filterDateFrom || filterDateTo) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs"
                          onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }}
                        >
                          Limpiar fechas
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alarms list */}
        <div className="space-y-3">
          {alarms.length === 0 && (
            <Card className="border-border">
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay alarmas registradas
              </CardContent>
            </Card>
          )}

          {filteredAlarms.map((alarm) => {
            const cfg = typeConfig[alarm.alarm_type] || typeConfig.panic;
            const isPending = alarm.status === "pending";
            const isProcessing = alarm.status === "processing";

            return (
              <Card
                key={alarm.id}
                className={`border ${isPending ? cfg.border + " animate-[blink-red_2s_ease-in-out_infinite]" : "border-border"} transition-all`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${cfg.color} text-foreground border-0 text-xs`}>
                          {cfg.emoji} {cfg.label}
                        </Badge>
                        <span className={`text-xs font-medium ${isPending ? "text-emergency-panic" : isProcessing ? "text-emergency-medical" : "text-green-400"}`}>
                          {isPending ? "PENDIENTE" : isProcessing ? "EN PROCESO" : "RESUELTA"}
                        </span>
                        <AlarmTimer createdAt={alarm.created_at} processedAt={alarm.processed_at} status={alarm.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div><span className="text-muted-foreground">Remitente:</span> {alarm.sender_name || "—"}</div>
                        <div><span className="text-muted-foreground">Teléfono:</span> {alarm.phone_number || "—"}</div>
                        <div><span className="text-muted-foreground">Casa:</span> {alarm.house_number || "—"}</div>
                        <div><span className="text-muted-foreground">Parcela:</span> {alarm.parcel_name || "—"}</div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Ubicación:</span>{" "}
                          {(() => {
                            const hasCoords = alarm.latitude !== null && alarm.longitude !== null;
                            const fallbackLocation = [
                              alarm.house_number ? `Casa ${alarm.house_number}` : null,
                              alarm.parcel_name ? `Parcela ${alarm.parcel_name}` : null,
                            ]
                              .filter(Boolean)
                              .join(", ");
                            const mapQuery = hasCoords
                              ? `${alarm.latitude},${alarm.longitude}`
                              : (alarm.address?.trim() || fallbackLocation);

                            if (!mapQuery) return <span>—</span>;

                            return (
                              <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`}
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center gap-1 text-emergency-medical hover:underline"
                              >
                                <MapPin className="w-3 h-3" /> Ver en Google Maps
                              </a>
                            );
                          })()}
                        </div>
                      </div>
                      {alarm.observations && (
                        <p className="text-xs text-muted-foreground mt-2 italic">Obs: {alarm.observations}</p>
                      )}
                      {alarm.status === "resolved" && (
                        <div className="mt-2 space-y-0.5 text-xs border-t border-border pt-2">
                          <div><span className="text-muted-foreground">Operador:</span> <span className="text-green-400 font-medium">{alarm.processed_by ? (operatorMap[alarm.processed_by] || "—") : "—"}</span></div>
                          <div><span className="text-muted-foreground">Recibido:</span> {new Date(alarm.created_at).toLocaleString("es-VE")}</div>
                          <div><span className="text-muted-foreground">Procesado:</span> {alarm.processed_at ? new Date(alarm.processed_at).toLocaleString("es-VE") : "—"}</div>
                          <div><span className="text-muted-foreground">Tiempo de respuesta:</span> <AlarmTimer createdAt={alarm.created_at} processedAt={alarm.processed_at} status={alarm.status} /></div>
                        </div>
                      )}
                      {alarm.status !== "resolved" && <p className="text-xs text-muted-foreground mt-1">{new Date(alarm.created_at).toLocaleString("es-VE")}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                      {isPending && (
                        <Button
                          size="sm"
                          className="bg-emergency-medical hover:bg-emergency-medical/80 text-foreground"
                          onClick={async () => {
                            await handleProcess(alarm, "processing");
                            setSelectedAlarm(alarm);
                            setObservations("");
                          }}
                          disabled={processing}
                        >
                          Atender
                        </Button>
                      )}
                      {(isProcessing || selectedAlarm?.id === alarm.id) && (
                        <>
                          <Textarea
                            placeholder="Observaciones..."
                            value={selectedAlarm?.id === alarm.id ? observations : ""}
                            onChange={(e) => { setSelectedAlarm(alarm); setObservations(e.target.value); }}
                            className="text-xs min-h-[60px] w-40"
                            autoFocus={selectedAlarm?.id === alarm.id}
                          />
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-foreground"
                            onClick={() => handleProcess(alarm, "resolved")}
                            disabled={processing || (selectedAlarm?.id === alarm.id ? !observations.trim() : true)}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Resolver
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
