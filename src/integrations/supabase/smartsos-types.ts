// Tipos ampliados para el schema `smartsos` mientras no se regenera
// automáticamente `types.ts` desde Supabase.  Extienden la base generada
// añadiendo un schema `smartsos` con tablas indexables por nombre, de modo
// que `db.from("<tabla>")` y `Tables<"<tabla>">` dejen de fallar.
import type { Database as GeneratedDatabase } from "./types";

type AnyTable = {
  Row: any;
  Insert: any;
  Update: any;
  Relationships: any[];
};

export type Database = GeneratedDatabase & {
  smartsos: {
    Tables: Record<string, AnyTable>;
    Views: Record<string, AnyTable>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
    CompositeTypes: Record<string, any>;
  };
};

export type Tables<T extends string> = Record<string, any>;
export type TablesInsert<T extends string> = Record<string, any>;
export type TablesUpdate<T extends string> = Record<string, any>;
