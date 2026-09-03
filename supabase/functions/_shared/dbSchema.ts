// Schema de base de datos donde viven las tablas de SmartSOS.
//
// Por defecto `public` (Lovable Cloud actual). Tras migrar a un proyecto
// Supabase propio con schema aislado, basta con crear el secreto:
//
//   DB_SCHEMA = smartsos
//
// y todas las Edge Functions apuntan a ese schema sin más cambios.
export const DB_SCHEMA: string = (Deno.env.get("DB_SCHEMA") ?? "public").trim() || "public";

/** Opciones de createClient para acceder al schema correcto. */
export const dbOptions = { db: { schema: DB_SCHEMA } };
