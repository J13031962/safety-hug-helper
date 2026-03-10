import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type AlarmType = "panic" | "medical" | "fire" | "disaster";

const alarmLabels: Record<AlarmType, string> = {
  panic: "🚨 PÁNICO",
  medical: "🏥 MÉDICA",
  fire: "🔥 INCENDIO",
  disaster: "⚠️ DESASTRE",
};

const alarmColors: Record<AlarmType, string> = {
  panic: "text-emergency-panic",
  medical: "text-emergency-medical",
  fire: "text-emergency-fire",
  disaster: "text-emergency-disaster",
};

interface ConfirmDialogProps {
  open: boolean;
  type: AlarmType | null;
  onClose: () => void;
}

export default function ConfirmDialog({ open, type, onClose }: ConfirmDialogProps) {
  const [countdown, setCountdown] = useState(6);
  const [sending, setSending] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get geolocation when dialog opens
  useEffect(() => {
    if (!open) return;
    setCountdown(6);
    setLocation(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (!open || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, countdown]);

  // Auto-send when countdown reaches 0
  useEffect(() => {
    if (open && countdown === 0 && !sending) {
      handleSend();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const handleSend = useCallback(async () => {
    if (!type || sending) return;
    setSending(true);

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
    } else {
      toast({ title: "Alerta enviada", description: `Alerta de ${alarmLabels[type]} enviada correctamente` });
      // Try to send WhatsApp via edge function
      try {
        await supabase.functions.invoke("send-whatsapp", { body: alarmData });
      } catch {
        // WhatsApp sending is best-effort
      }
    }

    setSending(false);
    onClose();
  }, [type, sending, location, onClose]);

  if (!type) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md border-border">
        <DialogHeader>
          <DialogTitle className={`text-2xl font-display ${alarmColors[type]}`}>
            {alarmLabels[type]}
          </DialogTitle>
          <DialogDescription>
            La alerta se enviará automáticamente. Puedes cancelar antes de que termine la cuenta regresiva.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          <div className={`text-7xl font-display font-bold ${alarmColors[type]} ${countdown <= 2 ? "animate-emergency-pulse" : ""}`}>
            {countdown}
          </div>
          <p className="text-sm text-muted-foreground">
            {location ? `📍 Ubicación detectada` : "📍 Obteniendo ubicación..."}
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className={`flex-1 ${
              type === "panic" ? "bg-emergency-panic hover:bg-emergency-panic/80" :
              type === "medical" ? "bg-emergency-medical hover:bg-emergency-medical/80" :
              type === "fire" ? "bg-emergency-fire hover:bg-emergency-fire/80" :
              "bg-emergency-disaster hover:bg-emergency-disaster/80"
            } text-foreground font-bold`}
          >
            {sending ? "Enviando..." : "Enviar ahora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
