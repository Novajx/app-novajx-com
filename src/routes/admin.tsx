import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck, Users, FileCheck2, ArrowDownToLine, Loader2, Search,
  CheckCircle2, XCircle, Clock, Ban, UserCheck, ExternalLink, Eye, ArrowLeftRight, Shield,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { fmtNJX } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  component: () => <RequireAuth requireStaff><AppShell><AdminPage /></AppShell></RequireAuth>,
  head: () => ({ meta: [{ title: "Admin — NovaJX" }] }),
});

type Tab = "overview" | "users" | "kyc" | "transactions" | "withdrawals";

function AdminPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  const tabs = ([
    { id: "overview", label: "Overview", Icon: ShieldCheck },
    { id: "users", label: "Users", Icon: Users },
    { id: "kyc", label: "KYC", Icon: FileCheck2 },
    { id: "transactions", label: "Transactions", Icon: ArrowLeftRight },
    ...(isAdmin ? [{ id: "withdrawals" as const, label: "Withdrawals", Icon: ArrowDownToLine }] : []),
  ] as const);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7" />
          <div>
            <h1 className="font-display text-2xl font-bold">{isAdmin ? "Admin Panel" : "Moderator Dashboard"}</h1>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border/60 bg-card p-1.5 shadow-soft">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-smooth ${
              tab === id ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview />}
      {tab === "users" && <UsersTab />}
      {tab === "kyc" && <KycTab />}
      {tab === "transactions" && <TransactionsTab />}
      {tab === "withdrawals" && isAdmin && <WithdrawalsTab />}
    </div>
  );
}

function Overview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, pendingKyc, pendingW, totalMinedRow] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("kyc_submissions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("wallets").select("balance, total_mined"),
      ]);
      const totalBalance = (totalMinedRow.data ?? []).reduce((s, w) => s + Number(w.balance ?? 0), 0);
      const totalMined = (totalMinedRow.data ?? []).reduce((s, w) => s + Number(w.total_mined ?? 0), 0);
      return {
        users: users.count ?? 0,
        pendingKyc: pendingKyc.count ?? 0,
        pendingW: pendingW.count ?? 0,
        totalBalance,
        totalMined,
      };
    },
  });

  if (isLoading) return <Loading />;

  const cards = [
    { label: "Total users", value: data!.users.toString(), Icon: Users, color: "text-primary" },
    { label: "Pending KYC", value: data!.pendingKyc.toString(), Icon: FileCheck2, color: "text-amber-500" },
    { label: "Pending withdrawals", value: data!.pendingW.toString(), Icon: ArrowDownToLine, color: "text-blue-500" },
    { label: "Total mined (NJX)", value: fmtNJX(data!.totalMined, 0), Icon: ShieldCheck, color: "text-emerald-500" },
    { label: "Total balance (NJX)", value: fmtNJX(data!.totalBalance, 0), Icon: ShieldCheck, color: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <c.Icon className={`h-5 w-5 ${c.color}`} />
          <p className="mt-2 text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-0.5 font-display text-xl font-bold">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let query = supabase
        .from("profiles_safe" as any)
        .select("id, full_name, email, country, banned, created_at, referral_code")
        .order("created_at", { ascending: false })
        .limit(100);
      if (q.trim()) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,referral_code.ilike.%${q}%`);
      const { data: profiles, error } = await query;
      if (error) throw error;
      type ProfileRow = { id: string; full_name: string; email: string | null; country: string | null; banned: boolean; created_at: string; referral_code: string };
      const rows = ((profiles ?? []) as unknown as ProfileRow[]);
      const ids = rows.map((p) => p.id);
      const { data: wallets } = ids.length
        ? await supabase.from("wallets").select("user_id, balance, total_mined").in("user_id", ids)
        : { data: [] as { user_id: string; balance: number; total_mined: number }[] };
      const wmap = new Map(wallets?.map((w) => [w.user_id, w]));
      const { data: roles } = ids.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
        : { data: [] as { user_id: string; role: string }[] };
      const rmap = new Map<string, string[]>();
      (roles ?? []).forEach((r) => {
        const arr = rmap.get(r.user_id) ?? [];
        arr.push(r.role);
        rmap.set(r.user_id, arr);
      });
      return rows.map((p) => ({ ...p, wallet: wmap.get(p.id), roles: rmap.get(p.id) ?? [] }));
    },
  });

  const toggleBan = useMutation({
    mutationFn: async ({ id, banned }: { id: string; banned: boolean }) => {
      const { error } = await supabase.rpc("admin_set_banned", { _user_id: id, _banned: banned });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success(v.banned ? "User banned" : "User unbanned");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMod = useMutation({
    mutationFn: async ({ id, makeMod }: { id: string; makeMod: boolean }) => {
      const { error } = await supabase.rpc("admin_set_role" as any, { _user_id: id, _make_moderator: makeMod });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success(v.makeMod ? "Moderator granted" : "Moderator revoked");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email or referral code..."
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      {isLoading ? <Loading /> : !data?.length ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No users found.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border/50">
          {data.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.full_name || "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Bal <span className="font-mono text-foreground">{fmtNJX(u.wallet?.balance ?? 0, 2)}</span> · Mined <span className="font-mono text-foreground">{fmtNJX(u.wallet?.total_mined ?? 0, 0)}</span>
                </p>
                {u.roles?.includes("admin") && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"><ShieldCheck className="h-3 w-3" /> Admin</span>
                )}
                {u.roles?.includes("moderator") && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500"><Shield className="h-3 w-3" /> Moderator</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {u.banned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500"><Ban className="h-3 w-3" /> Banned</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500"><UserCheck className="h-3 w-3" /> Active</span>
                )}
                {isAdmin && !u.roles?.includes("admin") && (
                  <button
                    onClick={() => toggleMod.mutate({ id: u.id, makeMod: !u.roles?.includes("moderator") })}
                    disabled={toggleMod.isPending}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                  >
                    {u.roles?.includes("moderator") ? "Revoke Mod" : "Make Mod"}
                  </button>
                )}
                <button
                  onClick={() => toggleBan.mutate({ id: u.id, banned: !u.banned })}
                  disabled={toggleBan.isPending}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  {u.banned ? "Unban" : "Ban"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KycTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-kyc", filter],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("kyc_submissions")
        .select("*")
        .eq("status", filter)
        .order("submitted_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return rows ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: "approve" | "reject"; reason?: string }) => {
      const args: { _kyc_id: string; _action: string; _reason?: string } = { _kyc_id: id, _action: action };
      if (reason) args._reason = reason;
      const { error } = await supabase.rpc("admin_review_kyc", args);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success(v.action === "approve" ? "KYC approved" : "KYC rejected");
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <FilterTabs value={filter} onChange={setFilter} options={["pending", "approved", "rejected"]} />
      {isLoading ? <Loading /> : !data?.length ? (
        <Empty label={`No ${filter} KYC submissions.`} />
      ) : (
        <div className="space-y-3">
          {data.map((k) => <KycCard key={k.id} k={k} onReview={review.mutate} pending={review.isPending} />)}
        </div>
      )}
    </div>
  );
}

function KycCard({ k, onReview, pending }: { k: any; onReview: (v: { id: string; action: "approve" | "reject"; reason?: string }) => void; pending: boolean }) {
  const [reason, setReason] = useState("");
  const [previewing, setPreviewing] = useState<string | null>(null);

  const signedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 60 * 5);
    return data?.signedUrl;
  };

  const openDoc = async (path: string) => {
    const url = await signedUrl(path);
    if (url) setPreviewing(url);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-bold">{k.full_name}</p>
          <p className="text-xs text-muted-foreground">{k.country} · DOB {k.dob}</p>
          <p className="mt-0.5 font-mono text-xs">{k.id_number}</p>
        </div>
        <StatusPill status={k.status} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "ID front", path: k.id_front_url },
          { label: "ID back", path: k.id_back_url },
          { label: "Selfie", path: k.selfie_url },
        ].map((d) => (
          <button key={d.label} onClick={() => openDoc(d.path)} className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium hover:bg-muted">
            <Eye className="h-3.5 w-3.5" /> {d.label}
          </button>
        ))}
      </div>

      {k.status === "pending" && (
        <div className="mt-3 space-y-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onReview({ id: k.id, action: "approve" })}
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => onReview({ id: k.id, action: "reject", reason: reason || undefined })}
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
          </div>
        </div>
      )}

      {k.rejection_reason && (
        <p className="mt-3 rounded-lg bg-red-500/10 p-2 text-xs text-red-500">Reason: {k.rejection_reason}</p>
      )}

      {previewing && (
        <div onClick={() => setPreviewing(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <img src={previewing} alt="document" className="max-h-[90vh] max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

function TransactionsTab() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-transactions", q],
    queryFn: async () => {
      const { data: txs, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const ids = Array.from(new Set((txs ?? []).flatMap((t) => [t.sender_id, t.receiver_id])));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] as { id: string; full_name: string; email: string }[] };
      const m = new Map(profs?.map((p) => [p.id, p]));
      const enriched = (txs ?? []).map((t) => ({ ...t, sender: m.get(t.sender_id), receiver: m.get(t.receiver_id) }));
      const ql = q.trim().toLowerCase();
      if (!ql) return enriched;
      return enriched.filter((t) =>
        [t.sender?.email, t.sender?.full_name, t.receiver?.email, t.receiver?.full_name, t.type, t.note]
          .some((v) => v?.toLowerCase().includes(ql))
      );
    },
  });

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search transactions..."
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>
      {isLoading ? <Loading /> : !data?.length ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No transactions found.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border/50">
          {data.map((t) => (
            <li key={t.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.type}</p>
                  <p className="truncate text-sm">
                    <span className="font-medium">{t.sender?.full_name || t.sender?.email || "—"}</span>
                    <span className="mx-1 text-muted-foreground">→</span>
                    <span className="font-medium">{t.receiver?.full_name || t.receiver?.email || "—"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <p className="shrink-0 font-mono text-sm font-bold">{fmtNJX(t.amount, 2)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WithdrawalsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "paid" | "rejected">("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", filter],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("status", filter)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
        : { data: [] as { id: string; full_name: string; email: string }[] };
      const m = new Map(profs?.map((p) => [p.id, p]));
      return (rows ?? []).map((r) => ({ ...r, profile: m.get(r.user_id) }));
    },
  });

  const process = useMutation({
    mutationFn: async ({ id, action, tx, note }: { id: string; action: "approve" | "reject"; tx?: string; note?: string }) => {
      const args: { _request_id: string; _action: string; _tx_hash?: string; _note?: string } = { _request_id: id, _action: action };
      if (tx) args._tx_hash = tx;
      if (note) args._note = note;
      const { error } = await supabase.rpc("admin_process_withdrawal", args);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success(v.action === "approve" ? "Marked as paid" : "Withdrawal rejected (refunded)");
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <FilterTabs value={filter} onChange={setFilter} options={["pending", "paid", "rejected"]} />
      {isLoading ? <Loading /> : !data?.length ? (
        <Empty label={`No ${filter} withdrawals.`} />
      ) : (
        <div className="space-y-3">
          {data.map((w) => <WithdrawalCard key={w.id} w={w} onProcess={process.mutate} pending={process.isPending} />)}
        </div>
      )}
    </div>
  );
}

function WithdrawalCard({ w, onProcess, pending }: { w: any; onProcess: (v: { id: string; action: "approve" | "reject"; tx?: string; note?: string }) => void; pending: boolean }) {
  const [tx, setTx] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">{fmtNJX(w.amount, 2)} NJX</p>
          <p className="truncate text-xs text-muted-foreground">{w.profile?.full_name || "—"} · {w.profile?.email}</p>
          <p className="mt-1 break-all rounded bg-muted px-2 py-1 font-mono text-xs">{w.wallet_address}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
        </div>
        <StatusPill status={w.status} />
      </div>

      {w.status === "pending" && (
        <div className="mt-3 space-y-2">
          <input value={tx} onChange={(e) => setTx(e.target.value)} placeholder="TX hash (for approval)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary" />
          <div className="flex gap-2">
            <button
              onClick={() => onProcess({ id: w.id, action: "approve", tx: tx || undefined, note: note || undefined })}
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark Paid
            </button>
            <button
              onClick={() => onProcess({ id: w.id, action: "reject", note: note || undefined })}
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Reject & Refund
            </button>
          </div>
        </div>
      )}

      {w.tx_hash && (
        <a href={`https://etherscan.io/tx/${w.tx_hash}`} target="_blank" rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 break-all text-xs font-medium text-primary hover:underline">
          TX: {w.tx_hash} <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {w.admin_note && <p className="mt-2 text-xs text-muted-foreground">Note: {w.admin_note}</p>}
    </div>
  );
}

function FilterTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly T[] }) {
  return (
    <div className="flex gap-1.5 rounded-xl border border-border/60 bg-card p-1 shadow-soft">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-smooth ${
            value === o ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { Icon: any; cls: string }> = {
    pending: { Icon: Clock, cls: "bg-amber-500/10 text-amber-500" },
    approved: { Icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-500" },
    paid: { Icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-500" },
    rejected: { Icon: XCircle, cls: "bg-red-500/10 text-red-500" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${s.cls}`}>
      <s.Icon className="h-3 w-3" /> {status}
    </span>
  );
}

function Loading() {
  return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}

function Empty({ label }: { label: string }) {
  return <p className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">{label}</p>;
}
