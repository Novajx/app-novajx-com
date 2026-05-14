import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Copy, Share2, Gift, Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtNJX } from "@/lib/format";

export const Route = createFileRoute("/referrals")({
  component: () => <RequireAuth><AppShell><ReferralsPage /></AppShell></RequireAuth>,
  head: () => ({ meta: [{ title: "Invite Friends — NovaJX" }] }),
});

function ReferralsPage() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("referral_code").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["ref-detail", user?.id],
    queryFn: async () => {
      const [{ count: total }, { data: wal }, { data: refs }] = await Promise.all([
        supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", user!.id),
        supabase.from("wallets").select("rnt_balance").eq("user_id", user!.id).maybeSingle(),
        supabase.from("referrals").select("total_bonus_earned").eq("referrer_id", user!.id),
      ]);
      const earned = (refs ?? []).reduce((s: number, r: any) => s + Number(r.total_bonus_earned ?? 0), 0);
      return {
        total: total ?? 0,
        rnt: Number((wal as any)?.rnt_balance ?? 0),
        earned,
      };
    },
    enabled: !!user,
  });

  const { data: list } = useQuery({
    queryKey: ["ref-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("id, status, created_at, referred_id")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const ids = data.map((r) => r.referred_id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map = new Map(profs?.map((p) => [p.id, p.full_name]) ?? []);
      return data.map((r) => ({ ...r, name: map.get(r.referred_id) || "User" }));
    },
    enabled: !!user,
  });

  const code = profile?.referral_code ?? "";
  const link = typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${code}` : "";
  const shareText = `Join NovaJX and start earning digital credits. Use my code ${code}:`;
  const enc = encodeURIComponent;
  const shareTargets = [
    { name: "WhatsApp", icon: MessageCircle, color: "bg-[#25D366]", href: `https://wa.me/?text=${enc(`${shareText} ${link}`)}` },
    { name: "Telegram", icon: Send, color: "bg-[#229ED9]", href: `https://t.me/share/url?url=${enc(link)}&text=${enc(shareText)}` },
    { name: "Facebook", icon: Share2, color: "bg-[#1877F2]", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}&quote=${enc(shareText)}` },
    { name: "X / Twitter", icon: Send, color: "bg-black", href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(link)}` },
    { name: "LinkedIn", icon: Share2, color: "bg-[#0A66C2]", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}` },
    { name: "Email", icon: Mail, color: "bg-muted-foreground", href: `mailto:?subject=${enc("Join me on NovaJX")}&body=${enc(`${shareText}\n\n${link}`)}` },
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join NovaJX", text: `Join NovaJX and earn digital credits. Use my code: ${code}`, url: link });
      } catch {}
    } else {
      copyLink();
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-primary p-7 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          <p className="text-sm font-medium opacity-90">Earn 1 RNT per successful invite</p>
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold">Invite & Earn Rewards</h1>
        <p className="mt-1 text-sm opacity-80">Share NovaJX with friends and grow your RNT balance.</p>

        <div className="mt-5 rounded-2xl bg-white/15 p-3 backdrop-blur">
          <p className="text-xs opacity-80">Your referral code</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-widest">{code}</p>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={copyLink} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-semibold text-primary transition-smooth hover:bg-white/90">
            <Copy className="h-4 w-4" /> Copy link
          </button>
          <button onClick={shareLink} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-sm font-semibold text-primary transition-smooth hover:bg-white/90">
            <Share2 className="h-4 w-4" /> Invite Friends
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Users} label="Total Invites" value={stats?.total ?? 0} />
        <Stat icon={Gift} label="RNT Balance" value={`${fmtNJX(stats?.rnt, 2)}`} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <Stat icon={Gift} label="RNT Earned from Referrals" value={`${fmtNJX(stats?.earned, 2)}`} />
      </div>

      {/* Social share */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <h2 className="font-display text-lg font-bold">Share on social</h2>
        <p className="mt-1 text-xs text-muted-foreground">Tap a platform to invite friends instantly.</p>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {shareTargets.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 p-3 transition-smooth hover:border-primary/60 hover:bg-accent"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full text-white ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium">{s.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <h2 className="font-display text-lg font-bold">Your referrals</h2>
        {!list?.length ? (
          <div className="py-8 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No referrals yet. Share your code!</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border/50">
            {list.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()} · {r.status}
                  </p>
                </div>
                <p className="text-sm font-bold text-primary">+1 RNT</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </div>
  );
}
