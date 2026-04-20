import { Link, useLocation } from "@tanstack/react-router";
import { Home, Pickaxe, Users, Wallet, User as UserIcon, Trophy, ShieldCheck } from "lucide-react";
import logo from "@/assets/novajx-logo.png";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", label: "Mine", icon: Pickaxe },
  { to: "/referrals", label: "Invite", icon: Users },
  { to: "/leaderboard", label: "Top", icon: Trophy },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logo} alt="NovaJX" width={32} height={32} className="h-8 w-8" />
            <span className="font-display text-lg font-bold tracking-tight">NovaJX</span>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/admin">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-xs font-medium transition-smooth ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}