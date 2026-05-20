import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { Gift, Users, ShieldCheck, Zap, Smartphone, Trophy, Globe, Coins } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — NovaJX" },
      { name: "description", content: "Daily one-tap rewards, referral RNT, KYC, leaderboards, and more — everything NovaJX offers." },
      { property: "og:title", content: "NovaJX Features" },
      { property: "og:description", content: "Daily rewards, referrals, KYC, leaderboards and more." },
    ],
  }),
  component: FeaturesPage,
});

const FEATURES = [
  { icon: Gift, title: "Daily one-tap rewards", desc: "Claim 2 NJX every 24 hours with a single tap." },
  { icon: Users, title: "Referral RNT", desc: "Earn 1 RNT for every friend who joins with your code." },
  { icon: ShieldCheck, title: "Manual KYC review", desc: "Human-verified accounts keep the network honest." },
  { icon: Trophy, title: "Live leaderboards", desc: "Climb global rankings as you collect and invite." },
  { icon: Zap, title: "Zero hardware", desc: "No rigs, no GPUs — your phone is enough." },
  { icon: Smartphone, title: "Mobile-first wallet", desc: "Track balances, history and KYC in one place." },
  { icon: Globe, title: "Available worldwide", desc: "180+ countries, fully offline-tolerant claims." },
  { icon: Coins, title: "Transparent supply", desc: "Predictable emissions and on-chain–style accounting." },
];

function FeaturesPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Every feature, one app</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">Everything you need to mine, invite, and grow inside NovaJX.</p>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm transition-smooth hover:border-primary/40 hover:shadow-elegant">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <f.icon className="h-4 w-4" />
              </div>
              <h3 className="font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}