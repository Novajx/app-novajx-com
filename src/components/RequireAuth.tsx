import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Loader2, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function RequireAuth({ children, requireAdmin = false, requireStaff = false }: { children: React.ReactNode; requireAdmin?: boolean; requireStaff?: boolean }) {
  const { user, loading, isAdmin, isStaff, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/signin" as any, search: { redirect: window.location.pathname } as any });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && requireAdmin && !isAdmin) {
      navigate({ to: "/dashboard" as any });
    }
    if (!loading && user && requireStaff && !isStaff) {
      navigate({ to: "/dashboard" as any });
    }
  }, [user, isAdmin, isStaff, requireAdmin, requireStaff, loading, navigate]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["banned-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("banned")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
  });

  if (loading || !user || (requireAdmin && !isAdmin) || (requireStaff && !isStaff)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff && profile?.banned) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-elegant">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Account suspended</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has been suspended. Contact support.
          </p>
          <Button onClick={() => signOut()} variant="outline" className="mt-6 w-full">
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}