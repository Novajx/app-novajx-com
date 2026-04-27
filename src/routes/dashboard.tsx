import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Gift, Wallet as WalletIcon, Lock, Loader2, ShieldCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { CoinIcon } from "@/components/CoinIcon";
import { fmtNJX, fmtCountdown } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  component: () => <RequireAuth><AppShell><Dashboard /></AppShell></RequireAuth>,
  head: () => ({ meta: [{ title: "Dashboard — NovaJX" }] }),
});

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("wallets").select("*").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: lastSession } = useQuery({
    queryKey: ["last-mining", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mining_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("claimed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-dash", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("kyc_approved_at")
        .eq("id", user!.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user,
  });

  const { data: kyc } = useQuery({
    queryKey: ["kyc-dash", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("kyc_submissions")
        .select("status")
        .eq("user_id", user!.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const claim = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_mining");
      if (error) throw error;
      return data as { amount: number; next_available_at: string };
    },
    onSuccess: (data) => {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#0d8b6e", "#f0c040", "#22c55e"] });
      toast.success(`+${data.amount} NJX collected!`, { description: "Come back in 24 hours." });
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nextAt = lastSession?.next_available_at ? new Date(lastSession.next_available_at).getTime() : 0;
  const canClaim = !lastSession || nextAt <= now;

  if (walletLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const lockedBal = Number((wallet as any)?.locked_balance ?? 0);
  const rntBal = Number((wallet as any)?.rnt_balance ?? 0);
  const kycStatus = kyc?.status ?? "not_submitted";
  const kycApproved = kycStatus === "approved";
  const approvedAt = profile?.kyc_approved_at ? new Date(profile.kyc_approved_at) : null;
  const unlockDate = approvedAt ? new Date(approvedAt.getTime() + 20 * 86400000) : null;
  const daysToSwap = unlockDate
    ? Math.max(0, Math.ceil((unlockDate.getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl bg-gradient-primary p-7 text-primary-foreground shadow-elegant"
      >
        <p className="text-sm opacity-80">Wallet balance</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-5xl font-bold">{fmtNJX(wallet?.balance, 2)}</span>
          <span className="text-lg opacity-90">NJX</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <p className="flex items-center gap-1 opacity-80"><Lock className="h-3 w-3" /> Locked</p>
            <p className="mt-0.5 font-semibold">{fmtNJX(lockedBal, 2)}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <p className="opacity-80">RNT</p>
            <p className="mt-0.5 font-semibold">{fmtNJX(rntBal, 2)}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <p className="opacity-80">Collected</p>
            <p className="mt-0.5 font-semibold">{fmtNJX(wallet?.total_mined, 2)}</p>
          </div>
        </div>
      </motion.div>

      {/* KYC + Swap status row */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to={"/kyc" as any}
          className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition-smooth hover:border-primary/40"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>KYC Status</span>
          </div>
          <p className={`mt-1 font-display text-lg font-bold capitalize ${kycApproved ? "text-emerald-500" : kycStatus === "pending" ? "text-amber-500" : "text-foreground"}`}>
            {kycStatus.replace("_", " ")}
          </p>
        </Link>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Swap Eligible In</span>
          </div>
          <p className="mt-1 font-display text-lg font-bold">
            {!kycApproved ? "—" : daysToSwap === 0 ? "Ready" : `${daysToSwap}d`}
          </p>
        </div>
      </div>

      {/* Collect Rewards card */}
      <div className="rounded-3xl border border-border/60 bg-card p-7 text-center shadow-soft">
        <div className="mx-auto flex h-32 w-32 items-center justify-center">
          <AnimatePresence mode="wait">
            {canClaim ? (
              <motion.div key="ready" initial={{ scale: 0 }} animate={{ scale: 1 }} className="animate-coin-pulse rounded-full">
                <CoinIcon size={120} />
              </motion.div>
            ) : (
              <motion.div key="cool" initial={{ scale: 0 }} animate={{ scale: 1 }} className="opacity-60">
                <CoinIcon size={120} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {canClaim ? (
          <>
            <h2 className="mt-6 font-display text-2xl font-bold">Ready to collect!</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tap below to collect your daily 2 NJX rewards.</p>
            <button
              onClick={() => claim.mutate()}
              disabled={claim.isPending}
              className="group relative mt-5 inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-primary px-10 py-4 text-base font-semibold text-primary-foreground shadow-elegant transition-bounce hover:scale-105 disabled:opacity-60"
            >
              {claim.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Gift className="h-5 w-5" /> COLLECT 2 NJX</>}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>
            <p className="mt-3 text-[11px] text-muted-foreground">Rewards are added to your locked balance.</p>
          </>
        ) : (
          <>
            <h2 className="mt-6 font-display text-2xl font-bold">24h cooldown active</h2>
            <p className="mt-1 text-sm text-muted-foreground">Next collection available in</p>
            <div className="mt-3 inline-block rounded-xl bg-muted px-5 py-3 font-mono text-2xl font-bold tabular-nums text-foreground">
              {fmtCountdown(new Date(nextAt))}
            </div>
          </>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={WalletIcon} label="Wallet" value={`${fmtNJX(wallet?.balance, 2)}`} />
        <StatCard icon={Lock} label="Locked" value={`${fmtNJX(lockedBal, 2)}`} />
        <StatCard icon={Gift} label="RNT" value={`${fmtNJX(rntBal, 2)}`} />
      </div>

      {/* Disclaimer */}
      <p className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-center text-[11px] text-muted-foreground">
        Novajx is a digital rewards platform. NJX credits are virtual and used داخل the app only.
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </div>
  );
}
