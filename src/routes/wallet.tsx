import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet as WalletIcon, ArrowUpRight, Loader2, ShieldAlert, CheckCircle2, Clock, XCircle } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtNJX } from "@/lib/format";

export const Route = createFileRoute("/wallet")({
  component: () => <RequireAuth><AppShell><WalletPage /></AppShell></RequireAuth>,
  head: () => ({ meta: [{ title: "Wallet — NovaJX" }] }),
});

function WalletPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");

  const { data: wallet, isLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("wallets").select("*").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: kyc } = useQuery({
    queryKey: ["kyc", user?.id],
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

  const { data: history } = useQuery({
    queryKey: ["withdrawals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: minWithdrawal } = useQuery({
    queryKey: ["min-withdrawal"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "min_withdrawal").maybeSingle();
      return Number(data?.value ?? 50);
    },
  });

  const withdraw = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      if (!address || address.trim().length < 6) throw new Error("Enter a valid wallet address");
      const { error } = await supabase.rpc("request_withdrawal", { _amount: amt, _wallet_address: address.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal requested!", { description: "Pending admin review." });
      setAmount("");
      setAddress("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const kycApproved = kyc?.status === "approved";
  const min = minWithdrawal ?? 50;

  return (
    <div className="space-y-5">
      {/* Balance */}
      <div className="rounded-3xl bg-gradient-primary p-7 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-2 text-sm opacity-80">
          <WalletIcon className="h-4 w-4" /> Available balance
        </div>
        <p className="mt-1 font-display text-4xl font-bold">{fmtNJX(wallet?.balance, 2)} <span className="text-xl opacity-90">NJX</span></p>
        <p className="mt-1 text-xs opacity-75">Min. withdrawal: {min} NJX</p>
      </div>

      {/* KYC gate */}
      {!kycApproved && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="font-semibold">KYC verification required</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {kyc?.status === "pending" ? "Your KYC is under review." : "Complete KYC to unlock withdrawals."}
            </p>
            <Link to={"/kyc" as any} className="mt-2 inline-block text-xs font-semibold text-primary underline">
              {kyc?.status === "pending" ? "View status →" : "Verify now →"}
            </Link>
          </div>
        </div>
      )}

      {/* Withdraw form */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <h2 className="font-display text-lg font-bold">Withdraw NJX</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (NJX)</span>
            <input
              type="number"
              value={amount}
              min={min}
              max={wallet?.balance ?? 0}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!kycApproved}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
              placeholder={`Minimum ${min}`}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Wallet Address</span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!kycApproved}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none focus:border-primary disabled:opacity-50"
              placeholder="0x..."
            />
          </label>
          <button
            onClick={() => withdraw.mutate()}
            disabled={!kycApproved || withdraw.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-bounce hover:scale-[1.02] disabled:opacity-60"
          >
            {withdraw.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ArrowUpRight className="h-4 w-4" /> Request Withdrawal</>}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <h2 className="font-display text-lg font-bold">Withdrawal history</h2>
        {!history?.length ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">No withdrawals yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/50">
            {history.map((w) => {
              const status = {
                pending: { Icon: Clock, color: "text-amber-500", label: "Pending" },
                approved: { Icon: Clock, color: "text-blue-500", label: "Approved" },
                paid: { Icon: CheckCircle2, color: "text-emerald-500", label: "Paid" },
                rejected: { Icon: XCircle, color: "text-red-500", label: "Rejected" },
              }[w.status];
              return (
                <li key={w.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">{fmtNJX(w.amount, 2)} NJX</p>
                    <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
                    <status.Icon className="h-3.5 w-3.5" /> {status.label}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
