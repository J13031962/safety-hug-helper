import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; data: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
  ]);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (userId: string, retries = 2): Promise<void> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await withTimeout(
          Promise.resolve(supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle()),
          5000
        ) as { data: { role: AppRole } | null; error: any };
        const { data, error } = result;
        if (error) {
          // Fallback: try RPC
          const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as AppRole });
          if (hasAdmin) { setRole("admin"); return; }
          const { data: hasOp } = await supabase.rpc("has_role", { _user_id: userId, _role: "operator" as AppRole });
          if (hasOp) { setRole("operator"); return; }
          const { data: hasDir } = await supabase.rpc("has_role", { _user_id: userId, _role: "director_monitoreo" as AppRole });
          if (hasDir) { setRole("director_monitoreo"); return; }
          const { data: hasSup } = await supabase.rpc("has_role", { _user_id: userId, _role: "supervisor_central" as AppRole });
          if (hasSup) { setRole("supervisor_central"); return; }
          setRole(null);
          return;
        }
        setRole(data?.role ?? null);
        return;
      } catch {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        } else {
          // Keep existing role on failure instead of clearing it
        }
      }
    }
  }, []);

  // Periodic role refresh to prevent "no role" after token refresh
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchRole(user.id, 1);
    }, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, [user, fetchRole]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to avoid blocking the auth state change callback
        setTimeout(() => {
          if (mounted) fetchRole(session.user.id);
        }, 0);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      5000
    );
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
      }),
      5000
    );
    return { data, error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
