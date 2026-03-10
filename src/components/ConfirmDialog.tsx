import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, MapPin, Loader2, ShieldX } from "lucide-react";

type AlarmType = "panic" | "medical" | "fire" | "disaster";

const alarmConfig: Record<AlarmType, { label: string; emoji: string; colorClass: string; bgClass: string }> = {
  panic: { label: "PÁNICO", emoji: "🔴", colorClass: "text-emergency-panic", bgClass: "bg-emergency-panic" },
  medical: { label: "MÉDICA", emoji: "🔵", colorClass: "text-emergency-medical", bgClass: "bg-emergency-medical" },
  fire: { label: "INCENDIO", emoji: "🟠", colorClass: "text-emergency-fire", bgClass: "bg-emergency-fire" },
  disaster: { label: "DESASTRE", emoji: "🟡", colorClass: "text-emergency-disaster", bgClass: "bg-emergency-disaster" },
};

interface ConfirmDialogProps {
  open: boolean;
  type: AlarmType | null;
  onClose: () => void;
  initialLocation?: { lat: number; lng: number } | null;
}

type DialogState = "confirm" | "sending" | "success" | "not_registered";

export default function ConfirmDialog({ open, type, onClose }: ConfirmDialogProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [state, setState] = useState<DialogState>("confirm");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [whatsappWarning, setWhatsappWarning] = useState<string | null>(null);

  // Check registration and get location when dialog opens
  useEffect(() => {
    if (!open) {
      setState("confirm");
      setCountdown(5);
      setLocation(null);
      setWhatsappWarning(null);
      return;
    }

    // Check if user is registered
    const checkRegistration = async () => {
      const settings = JSON.parse(localStorage.getItem("sosalerta_settings") || "{}");
      const phone = settings.phoneNumber?.trim();
      
      if (!phone) {
        setState("not_registered");
        return;
      }

      // Strip non-digit characters for flexible matching
      const phoneDigits = phone.replace(/\D/g, "");

      const { data: allNumbers } = await supabase
        .from("registered_numbers")
        .select("id, phone_number");

      const match = allNumbers?.find((r) => {
        const registeredDigits = r.phone_number.replace(/\D/g, "");
        return registeredDigits === phoneDigits || 
               registeredDigits.endsWith(phoneDigits) || 
               phoneDigits.endsWith(registeredDigits);
      });

      if (!match) {
        setState("not_registered");
        return;
      }

      setState("confirm");
    };

    checkRegistration();

    // Get location - try multiple methods
    setLocating(true);
    if (navigator.geolocation) {
      // First try high accuracy
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
        () => {
          // Fallback: try without high accuracy
          navigator.geolocation.getCurrentPosition(
            (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
            () => { setLocation(null); setLocating(false); },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    } else {
      setLocating(false);
    }
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (!open || state !== "confirm" || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, state, countdown]);

  // Auto-send when countdown reaches 0
  useEffect(() => {
    if (open && countdown === 0 && state === "confirm") {
      handleSend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const handleSend = useCallback(async () => {
    if (!type || state === "sending") return;
    setState("sending");

    const settings = JSON.parse(localStorage.getItem("sosalerta_settings") || "{}");

    const alarmData = {
      alarm_type: type,
      sender_name: settings.senderName || "Usuario",
      phone_number: settings.phoneNumber || "",
      house_number: settings.houseNumber || "",
      parcel_name: settings.parcelName || "",
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
    };

    const { error } = await supabase.from("alarms").insert(alarmData);

    if (error) {
      toast({ title: "Error", description: "No se pudo enviar la alerta", variant: "destructive" });
      setState("confirm");
      return;
    }

    // Try WhatsApp
    try {
      const { error: whatsErr } = await supabase.functions.invoke("send-whatsapp", { body: alarmData });
      if (whatsErr) {
        setWhatsappWarning("No se enviaron mensajes WhatsApp. Configura las API keys de CallMeBot en los números registrados.");
      }
    } catch {
      setWhatsappWarning("No se enviaron mensajes WhatsApp. Configura las API keys de CallMeBot en los números registrados.");
    }

    setState("success");
  }, [type, state, location]);

  const handleClose = () => {
    onClose();
  };

  if (!type) return null;

  const cfg = alarmConfig[type];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && state !== "sending") handleClose(); }}>
      <DialogContent className="sm:max-w-md border-border p-0 overflow-hidden [&>button.absolute]:hidden">

        {state === "not_registered" ? (
          /* ── Not Registered Screen ── */
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="w-16 h-16 rounded-full border-2 border-emergency-panic/50 flex items-center justify-center">
              <ShieldX className="w-10 h-10 text-emergency-panic" />
            </div>
            <h2 className="text-xl font-display font-bold">No Registrado</h2>
            <p className="text-sm text-muted-foreground text-center">
              Su número no se encuentra registrado en el sistema. Asegúrese de configurar su número de teléfono en Configuración.
            </p>
            <div className="w-full rounded-lg border border-emergency-disaster/40 bg-emergency-disaster/10 p-3 text-xs text-emergency-disaster flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Vaya a Configuración, ingrese su número de teléfono registrado y guarde. Si su número no está registrado, contacte al administrador.</span>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cerrar
              </Button>
              <Button onClick={() => { handleClose(); navigate("/configuracion"); }} className="flex-1 bg-emergency-medical hover:bg-emergency-medical/80 text-foreground font-bold">
                Ir a Configuración
              </Button>
            </div>
          </div>

        ) : state === "success" ? (
          /* ── Success Screen ── */
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="w-16 h-16 rounded-full border-2 border-emergency-medical flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emergency-medical" />
            </div>
            <h2 className="text-xl font-display font-bold">¡Alerta Enviada!</h2>
            <p className="text-sm text-muted-foreground text-center">
              Se notificó a todos los contactos y se activó la sirena.
            </p>
            {whatsappWarning && (
              <div className="w-full rounded-lg border border-emergency-disaster/40 bg-emergency-disaster/10 p-3 text-xs text-emergency-disaster flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{whatsappWarning}</span>
              </div>
            )}
            <Button variant="outline" onClick={handleClose} className="mt-2 w-full">
              Cerrar
            </Button>
          </div>

        ) : (
          /* ── Confirm / Sending Screen ── */
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full border-2 border-emergency-panic/50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-emergency-panic" />
              </div>
              {state === "confirm" && countdown > 0 && (
                <div className={`w-10 h-10 rounded-full border-2 border-emergency-panic flex items-center justify-center ${countdown <= 2 ? "animate-emergency-pulse" : ""}`}>
                  <span className="text-lg font-display font-bold text-emergency-panic">{countdown}</span>
                </div>
              )}
            </div>

            <h2 className="text-xl font-display font-bold mb-1">Confirmar Emergencia</h2>
            <p className="text-sm text-muted-foreground mb-4">Estás a punto de enviar una alerta de:</p>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{cfg.emoji}</span>
              <span className="font-display font-bold text-lg">{cfg.label}</span>
            </div>

            <div className="flex items-center gap-2 text-sm mb-4">
              {locating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Obteniendo ubicación...</span>
                </>
              ) : location ? (
                <>
                  <MapPin className="w-4 h-4 text-emergency-panic" />
                  <span className="text-muted-foreground">
                    📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">📍 Ubicación no disponible</span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-6">
              Se enviará un mensaje automático por WhatsApp a todos los contactos registrados y se activará la sirena.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={state === "sending"}
                className="flex-1 font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={state === "sending"}
                className={`flex-1 ${cfg.bgClass} hover:${cfg.bgClass}/80 text-foreground font-bold`}
              >
                {state === "sending" ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Enviando...</>
                ) : (
                  "CONFIRMAR"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
