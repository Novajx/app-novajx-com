import { Link, useLocation } from "@tanstack/react-router";
import { Gift, Users, Wallet, User as UserIcon, Trophy, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CoinIcon } from "@/components/CoinIcon";

const navItems = [
  { to: "/dashboard", label: "Collect", icon: Gift },
  { to: "/referrals", label: "Invite", icon: Users },
  { to: "/leaderboard", label: "Top", icon: Trophy },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAdmin, isStaff } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to={"/dashboard" as any} className="flex items-center gap-2">
            <CoinIcon size={32} />
            <span className="font-display text-lg font-bold tracking-tight">NovaJX</span>
          </Link>
          <div className="flex items-center gap-2">
            {isStaff && (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to={"/admin" as any}>
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">{isAdmin ? "Admin" : "Moderator"}</span>
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
                to={item.to as any}
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