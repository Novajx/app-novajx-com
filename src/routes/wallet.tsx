import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Loader2,
  ShieldAlert,
  Clock,
  Search,
  Lock,
  Repeat,
  Gift,
  Copy,
  Check,
  X,
  Receipt,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtNJX } from "@/lib/format";

export const Route = createFileRoute("/wallet")({
  component: () => (
    <RequireAuth>
      <AppShell>
        <WalletPage />
      </AppShell>
    </RequireAuth>
  ),
  head: () => ({ meta: [{ title: "Wallet — NovaJX" }] }),
});

type Tab = "send" | "swap" | "history";

function WalletPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("send");
  const [copied, setCopied] = useState(false);
  const [receiptTx, setReceiptTx] = useState<any | null>(null);

  // Send NJX state
  const [recipient, setRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [lookup, setLookup] = useState<{ id: string; full_name: string; referral_code: string } | null>(null);
  const [lookupErr, setLookupErr] = useState<string | null>(null);

  // Swap state
  const [swapAmount, setSwapAmount] = useState("");

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

  const { data: profile } = useQuery({
    queryKey: ["profile-kyc-approved-at", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user,
  });

  // Swap restrictions removed: no minimum, no waiting period after KYC.

  const { data: txs } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Fetch counterparty names
  const counterpartyIds = Array.from(
    new Set(
      (txs ?? []).map((t) => (t.sender_id === user?.id ? t.receiver_id : t.sender_id)),
    ),
  );
  const { data: counterparties } = useQuery({
    queryKey: ["counterparties", counterpartyIds],
    queryFn: async () => {
      if (!counterpartyIds.length) return {} as Record<string, string>;
      const { data } = await supabase.from("profiles").select("id,full_name,referral_code").in("id", counterpartyIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p) => (map[p.id] = p.full_name || p.referral_code));
      return map;
    },
    enabled: counterpartyIds.length > 0,
  });

  const lookupUser = async () => {
    setLookupErr(null);
    setLookup(null);
    const q = recipient.trim();
    if (!q) return;
    const { data, error } = await supabase.rpc("find_user_for_transfer", { _query: q });
    if (error || !data || (data as any).length === 0) {
      setLookupErr("Recipient not found");
      return;
    }
    const found = (data as any)[0];
    if (found.id === user?.id) {
      setLookupErr("You cannot send to yourself");
      return;
    }
    setLookup(found);
  };

  const sendNjx = useMutation({
    mutationFn: async () => {
      const amt = Number(sendAmount);
      if (!recipient.trim()) throw new Error("Enter a recipient");
      if (!amt || amt <= 0) throw new Error("Amount must be greater than 0");
      if (amt > Number(wallet?.balance ?? 0)) throw new Error("Insufficient balance");
      const { error } = await supabase.rpc("transfer_njx", {
        _recipient: recipient.trim(),
        _amount: amt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transfer sent!", { description: `${sendAmount} NJX delivered.` });
      setRecipient("");
      setSendAmount("");
      setLookup(null);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const swap = useMutation({
    mutationFn: async () => {
      const amt = Number(swapAmount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount");
      const { error } = await (supabase as any).rpc("swap_njx", { _amount: amt });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Swap successful!", { description: `${swapAmount} NJX moved to wallet.` });
      setSwapAmount("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );

  const kycApproved = kyc?.status === "approved";
  const balance = Number(wallet?.balance ?? 0);
  const locked = Number((wallet as any)?.locked_balance ?? 0);
  const rnt = Number((wallet as any)?.rnt_balance ?? 0);

  // Swap eligibility: KYC-approved users can swap any positive amount immediately
  const canSwap = kycApproved && locked > 0;

  // Transfer eligibility — anyone with available balance can send
  const hasAvailable = balance > 0;
  const canSend = hasAvailable;
  const sendBlockReason = !hasAvailable
    ? "No available credits. Convert your locked credits first"
    : null;

  return (
    <div className="space-y-5">
      {/* Balance */}
      <div className="rounded-3xl bg-gradient-primary p-7 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-2 text-sm opacity-80">
          <WalletIcon className="h-4 w-4" /> Wallet balance
        </div>
        <p className="mt-1 font-display text-4xl font-bold">
          {fmtNJX(wallet?.balance, 2)} <span className="text-xl opacity-90">NJX</span>
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
            <p className="flex items-center gap-1 opacity-75"><Lock className="h-3 w-3" /> Locked</p>
            <p className="mt-0.5 font-semibold">{fmtNJX(locked, 2)}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
            <p className="opacity-75">Sent</p>
            <p className="mt-0.5 font-semibold">{fmtNJX((wallet as any)?.total_sent ?? 0, 2)}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
            <p className="opacity-75">Received</p>
            <p className="mt-0.5 font-semibold">{fmtNJX((wallet as any)?.total_received ?? 0, 2)}</p>
          </div>
        </div>
      </div>

      {/* RNT Balance */}
      {/* Wallet Address */}
      {(wallet as any)?.wallet_address && (
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <WalletIcon className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold uppercase tracking-wider">Your Wallet Address</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-xl bg-muted px-3 py-2.5 font-mono text-sm font-semibold tracking-wide">
              {(wallet as any).wallet_address}
            </code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText((wallet as any).wallet_address);
                setCopied(true);
                toast.success("Wallet address copied");
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold transition-smooth hover:border-primary"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Share this address to receive NJX or RNT from other users.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Gift className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold uppercase tracking-wider">RNT Balance</span>
              <span className="font-mono text-[11px] normal-case tracking-normal text-primary">(1 RNT = 5 NJX)</span>
            </div>
            <p className="mt-1 font-display text-3xl font-bold">
              {fmtNJX(rnt, 2)} <span className="text-base text-muted-foreground">RNT</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Referral Reward Token</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Earned from successful referrals</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border/60 bg-card p-1">
        {([
          { key: "send", label: "Send", icon: Send },
          { key: "swap", label: "Swap", icon: Repeat },
          { key: "history", label: "History", icon: Clock },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-smooth ${
              tab === t.key
                ? "bg-gradient-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* SEND TAB */}
      {tab === "send" && (
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-bold">Send NJX</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Transfer NJX instantly to another NovaJX user.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-border/60 bg-background px-3 py-2">
              <p className="text-muted-foreground">Available Credits</p>
              <p className="mt-0.5 font-display text-base font-bold">{fmtNJX(balance, 2)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background px-3 py-2">
              <p className="flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" /> Pending Credits</p>
              <p className="mt-0.5 font-display text-base font-bold">{fmtNJX(locked, 2)}</p>
            </div>
          </div>

          <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
            Send NJX instantly to anyone with a wallet address, email, or referral code.
          </p>

          {sendBlockReason && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="flex-1">
                <p className="font-semibold">{sendBlockReason}</p>
                {!hasAvailable && (
                  <button
                    type="button"
                    onClick={() => setTab("swap")}
                    className="mt-1 font-semibold text-primary underline"
                  >
                    Go to Swap →
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Recipient (Wallet Address, Email, or Referral Code)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    setLookup(null);
                    setLookupErr(null);
                  }}
                  disabled={!canSend}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="NJX-XXXXXXXX, email, or NJXABC12"
                />
                <button
                  type="button"
                  onClick={lookupUser}
                  disabled={!recipient.trim() || !canSend}
                  className="flex items-center gap-1 rounded-xl border border-border bg-background px-3 text-xs font-semibold transition-smooth hover:bg-accent disabled:opacity-50"
                >
                  <Search className="h-3.5 w-3.5" /> Find
                </button>
              </div>
              {lookup && (
                <p className="mt-1.5 text-xs text-emerald-500">
                  ✓ Sending to <strong>{lookup.full_name || lookup.referral_code}</strong>
                </p>
              )}
              {lookupErr && <p className="mt-1.5 text-xs text-red-500">{lookupErr}</p>}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (NJX)</span>
              <input
                type="number"
                value={sendAmount}
                step="0.01"
                min="0.01"
                max={balance}
                onChange={(e) => setSendAmount(e.target.value)}
                disabled={!canSend}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="0.00"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Available: {fmtNJX(balance, 2)} NJX</p>
            </label>

            <button
              onClick={() => sendNjx.mutate()}
              disabled={!canSend || sendNjx.isPending || !recipient.trim() || !sendAmount}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-bounce hover:scale-[1.02] disabled:scale-100 disabled:opacity-60"
            >
              {sendNjx.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" /> Send NJX
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SWAP TAB */}
      {tab === "swap" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Locked
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{fmtNJX(locked, 2)}</p>
              <p className="text-[11px] text-muted-foreground">NJX (mined)</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <WalletIcon className="h-3.5 w-3.5" /> Wallet
              </p>
              <p className="mt-1 font-display text-2xl font-bold">{fmtNJX(balance, 2)}</p>
              <p className="text-[11px] text-muted-foreground">NJX (usable)</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Swap Locked → Wallet</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Move your mined coins into your spendable wallet. Available immediately after KYC approval.
            </p>

            {!kycApproved && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="font-semibold">KYC required</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Approve KYC to unlock the swap feature.
                  </p>
                  <Link to={"/kyc" as any} className="mt-2 inline-block text-xs font-semibold text-primary underline">
                    Verify now →
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Amount (NJX)</span>
                <input
                  type="number"
                  value={swapAmount}
                  min={0}
                  max={locked}
                  step="0.01"
                  onChange={(e) => setSwapAmount(e.target.value)}
                  disabled={!canSwap}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
                  placeholder="Enter amount"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Locked: {fmtNJX(locked, 2)} NJX
                </p>
              </label>

              <button
                onClick={() => swap.mutate()}
                disabled={!canSwap || swap.isPending || !swapAmount}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-bounce hover:scale-[1.02] disabled:scale-100 disabled:opacity-60"
              >
                {swap.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Repeat className="h-4 w-4" /> Swap Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Transfers</h2>
            {!txs?.length ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">No transfers yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border/50">
                {txs.map((t) => {
                  const isSent = t.sender_id === user?.id;
                  const otherId = isSent ? t.receiver_id : t.sender_id;
                  const name = counterparties?.[otherId] ?? otherId.slice(0, 8);
                  const Icon = isSent ? ArrowUpRight : ArrowDownLeft;
                  const unit = t.type === "rnt_transfer" ? "RNT" : "NJX";
                  return (
                    <li
                      key={t.id}
                      onClick={() => setReceiptTx({ ...t, _name: name, _isSent: isSent, _unit: unit })}
                      className="flex cursor-pointer items-center justify-between gap-3 py-3 transition-smooth hover:bg-accent/40 rounded-lg px-2 -mx-2"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            isSent ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{isSent ? "Sent to" : "Received from"} {name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`shrink-0 text-sm font-bold ${
                          isSent ? "text-red-500" : "text-emerald-500"
                        }`}
                      >
                        {isSent ? "-" : "+"}
                        {fmtNJX(t.amount, 2)} {unit}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Transaction Receipt Modal */}
      {receiptTx && (
        <div
          onClick={() => setReceiptTx(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-elegant"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">Transaction Receipt</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {receiptTx.status === "completed" ? "Successful" : receiptTx.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReceiptTx(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-muted/40 p-5 text-center">
              <p className="text-xs text-muted-foreground">
                {receiptTx._isSent ? "Amount Sent" : "Amount Received"}
              </p>
              <p
                className={`mt-1 font-display text-3xl font-bold ${
                  receiptTx._isSent ? "text-red-500" : "text-emerald-500"
                }`}
              >
                {receiptTx._isSent ? "-" : "+"}
                {fmtNJX(receiptTx.amount, 4)} {receiptTx._unit}
              </p>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-semibold capitalize">{String(receiptTx.type).replace("_", " ")}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">{receiptTx._isSent ? "To" : "From"}</dt>
                <dd className="text-right font-semibold">{receiptTx._name}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="text-right font-semibold">
                  {new Date(receiptTx.created_at).toLocaleString()}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-semibold capitalize text-emerald-500">{receiptTx.status}</dd>
              </div>
              {receiptTx.note && (
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Note</dt>
                  <dd className="text-right font-semibold">{receiptTx.note}</dd>
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Tx ID</dt>
                <dd className="text-right font-mono text-[11px] break-all">{receiptTx.id}</dd>
              </div>
            </dl>

            <button
              onClick={async () => {
                await navigator.clipboard.writeText(receiptTx.id);
                toast.success("Transaction ID copied");
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-sm font-semibold transition-smooth hover:border-primary"
            >
              <Copy className="h-3.5 w-3.5" /> Copy Transaction ID
            </button>
          </div>
        </div>
      )}
    </div>
  );
}