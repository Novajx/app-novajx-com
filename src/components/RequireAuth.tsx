import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export function RequireAuth({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
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
  }, [user, isAdmin, requireAdmin, loading, navigate]);

  if (loading || !user || (requireAdmin && !isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}