import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User as UserIcon, LogOut, Copy, ShieldCheck, Loader2, Mail } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  component: () => <RequireAuth><AppShell><ProfilePage /></AppShell></RequireAuth>,
  head: () => ({ meta: [{ title: "Profile — NovaJX" }] }),
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
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

  const [form, setForm] = useState({ full_name: "", country: "", phone: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        country: profile.country ?? "",
        phone: profile.phone ?? "",
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name, country: form.country, phone: form.phone })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" as any });
  };

  const copyCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success("Referral code copied");
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const kycBadge = {
    approved: { label: "Verified", color: "bg-emerald-500/15 text-emerald-600" },
    pending: { label: "Under Review", color: "bg-amber-500/15 text-amber-600" },
    rejected: { label: "Rejected", color: "bg-red-500/15 text-red-600" },
    not_submitted: { label: "Not Verified", color: "bg-muted text-muted-foreground" },
  }[kyc?.status ?? "not_submitted"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-3xl border border-border/60 bg-card p-7 text-center shadow-soft">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-elegant">
          <UserIcon className="h-10 w-10" />
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold">{profile?.full_name || "User"}</h1>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5" /> {user?.email}
        </p>
        <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${kycBadge.color}`}>
          <ShieldCheck className="h-3 w-3" /> {kycBadge.label}
        </span>
      </div>

      {/* Referral code */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <p className="text-xs font-medium text-muted-foreground">Your referral code</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded-xl bg-muted px-4 py-3 font-mono text-lg font-bold tracking-wider">{profile?.referral_code}</code>
          <button onClick={copyCode} className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant transition-bounce hover:scale-105">
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <h2 className="font-display text-lg font-bold">Edit profile</h2>
        <div className="mt-4 space-y-3">
          <Field label="Full Name">
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Country">
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </Field>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="w-full rounded-2xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition-bounce hover:scale-[1.02] disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Save changes"}
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={"/kyc" as any} className="rounded-2xl border border-border/60 bg-card p-4 text-center shadow-soft transition-smooth hover:border-primary">
          <ShieldCheck className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1.5 text-sm font-semibold">KYC</p>
        </Link>
        <Link to={"/wallet" as any} className="rounded-2xl border border-border/60 bg-card p-4 text-center shadow-soft transition-smooth hover:border-primary">
          <UserIcon className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1.5 text-sm font-semibold">Wallet</p>
        </Link>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 py-3.5 text-sm font-semibold text-red-600 transition-smooth hover:bg-red-500/10"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
