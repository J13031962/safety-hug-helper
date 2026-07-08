import { useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";

const VERSION_URL = "/version.json";
const POLL_INTERVAL_MS = 60_000;

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

/**
 * Poll /version.json and reload the page when a new deploy is detected.
 * No-op in development.
 */
export function useAutoUpdate() {
  const initialVersion = useRef<string | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    let cancelled = false;

    const triggerReload = () => {
      if (reloading.current) return;
      reloading.current = true;
      toast({
        title: "Actualizando…",
        description: "Cargando la última versión de la aplicación.",
      });
      setTimeout(() => window.location.reload(), 1500);
    };

    const check = async () => {
      const v = await fetchVersion();
      if (cancelled || !v) return;
      if (initialVersion.current === null) {
        initialVersion.current = v;
        return;
      }
      if (v !== initialVersion.current) {
        triggerReload();
      }
    };

    check();
    const interval = window.setInterval(check, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
