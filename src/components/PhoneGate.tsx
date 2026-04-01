import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Loader2, Phone, AlertCircle } from "lucide-react";

interface RegisteredUser {
  owner_name: string;
  phone_number: string;
  house_number: string | null;
  parcel_name: string | null;
}

interface PhoneGateProps {
  children: React.ReactNode;
}

export default function PhoneGate({ children }: PhoneGateProps) {
  const [verified, setVerified] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already verified on mount - re-fetch parcels if missing
  useEffect(() => {
    const saved = localStorage.getItem("sosalerta_settings");
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.phoneVerified && settings.phoneNumber) {
        if (settings.parcels) {
          setVerified(true);
          setLoading(false);
        } else {
          // Old format without parcels - re-fetch
          const digits = settings.phoneNumber.replace(/\D/g, "");
          supabase
            .from("registered_numbers")
            .select("phone_number, owner_name, house_number, parcel_name")
            .then(({ data }) => {
              const matches = data?.filter((r) => {
                const rd = r.phone_number.replace(/\D/g, "");
                return rd === digits || rd.endsWith(digits) || digits.endsWith(rd);
              });
              if (matches && matches.length > 0) {
                const parcels = matches.map((m) => ({
                  parcelName: m.parcel_name || "",
                  houseNumber: m.house_number || "",
                  ownerName: m.owner_name,
                }));
                const updated = { ...settings, parcels, parcelName: parcels[0].parcelName, houseNumber: parcels[0].houseNumber, senderName: parcels[0].ownerName };
                localStorage.setItem("sosalerta_settings", JSON.stringify(updated));
              }
              setVerified(true);
              setLoading(false);
            });
        }
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const normalizeDigits = (val: string) => val.replace(/\D/g, "");

  const handleVerify = async () => {
    const digits = normalizeDigits(phone);
    if (digits.length < 7) {
      setError("Ingresa un número válido");
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const { data: allNumbers } = await supabase
        .from("registered_numbers")
        .select("phone_number, owner_name, house_number, parcel_name");

    const matches = allNumbers?.filter((r) => {
        const rd = normalizeDigits(r.phone_number);
        return rd === digits || rd.endsWith(digits) || digits.endsWith(rd);
      }) as RegisteredUser[] | undefined;

      if (!matches || matches.length === 0) {
        setError("Este número no está registrado. Contacte al administrador.");
        setChecking(false);
        return;
      }

      // Build parcels array from all matches
      const parcels = matches.map((m) => ({
        parcelName: m.parcel_name || "",
        houseNumber: m.house_number || "",
        ownerName: m.owner_name,
      }));

      const first = parcels[0];

      // Save to localStorage so ConfirmDialog and the app can use it
      const settings = {
        phoneNumber: phone.trim(),
        senderName: first.ownerName,
        houseNumber: first.houseNumber,
        parcelName: first.parcelName,
        phoneVerified: true,
        parcels,
      };
      localStorage.setItem("sosalerta_settings", JSON.stringify(settings));
      setVerified(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (verified) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full border-2 border-emergency-panic/40 flex items-center justify-center bg-emergency-panic/10">
            <Shield className="w-10 h-10 text-emergency-panic" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight">SmartSOS</h1>
          <p className="text-sm text-muted-foreground text-center">
            Ingresa tu número de celular registrado para acceder
          </p>
        </div>

        {/* Phone input */}
        <div className="w-full space-y-3">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="Ej: 3136880800"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              className="pl-10 h-12 text-base"
              maxLength={15}
              autoFocus
            />
          </div>

          {error && (
            <div className="rounded-lg border border-emergency-panic/40 bg-emergency-panic/10 p-3 text-xs text-emergency-panic flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleVerify}
            disabled={checking || normalizeDigits(phone).length < 7}
            className="w-full h-12 bg-emergency-panic hover:bg-emergency-panic/80 text-foreground font-display font-bold text-base"
          >
            {checking ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verificando...</>
            ) : (
              "Ingresar"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="w-full h-10"
          >
            Cerrar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Solo los números registrados por el administrador pueden enviar alertas de emergencia.
        </p>
      </div>
    </div>
  );
}
