import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  user: null,
  session: null,
  isAdmin: false,
  isModerator: false,
  isStaff: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    // Listener BEFORE getSession (proper pattern)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          setRolesLoaded(false);
          // defer to avoid deadlock
          setTimeout(async () => {
            const { data } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", sess.user.id);
            setIsAdmin(!!data?.some((r) => r.role === "admin"));
            setIsModerator(!!data?.some((r) => (r.role as string) === "moderator"));
            setRolesLoaded(true);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsModerator(false);
          setRolesLoaded(true);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (!sess?.user) setRolesLoaded(true);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsModerator(false);
    setRolesLoaded(true);
  };

  return (
    <AuthCtx.Provider value={{ user, session, isAdmin, isModerator, isStaff: isAdmin || isModerator, loading: loading || (!!user && !rolesLoaded), signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);