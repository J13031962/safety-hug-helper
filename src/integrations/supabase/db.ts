// Cliente de datos con schema configurable.
//
// Por defecto usa el schema `public` (Lovable Cloud actual) y reutiliza el
// cliente autogenerado, así que hoy el comportamiento es idéntico.
//
// Tras migrar a un proyecto Supabase propio con el schema aislado, basta con
// definir en el entorno:
//
//   VITE_DB_SCHEMA="smartsos"
//
// y todas las consultas (`db.from(...)`, `db.rpc(...)`) y el realtime apuntan
// a ese schema sin tocar ninguna pantalla.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";
import { supabase } from "./client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string;

/** Schema de base de datos donde viven las tablas de SmartSOS. */
export const DB_SCHEMA: string =
  (import.meta.env.VITE_DB_SCHEMA as string | undefined)?.trim() || "public";

/**
 * Cliente para acceso a datos (tablas, RPC y realtime).
 *
 * Para auth (`supabase.auth`) y edge functions (`supabase.functions`) se sigue
 * usando el cliente autogenerado: comparten el mismo almacenamiento de sesión.
 */
export const db =
  DB_SCHEMA === "public"
    ? supabase
    : createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          storage: brokeredPreviewStorage(),
          persistSession: true,
          autoRefreshToken: true,
        },
        db: { schema: DB_SCHEMA as "public" },
      });
