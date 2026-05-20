import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { ShieldCheck, Lock, Eye, KeyRound, AlertTriangle, ScanFace } from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — NovaJX" },
      { name: "description", content: "How NovaJX protects your account, identity, and rewards: KYC, encryption, RLS, and audited infrastructure." },
      { property: "og:title", content: "NovaJX Security" },
      { property: "og:description", content: "End-to-end protection for your account and rewards." },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const items = [
    { icon: ScanFace, title: "Manual KYC", desc: "Human-reviewed identity checks block bots and duplicate accounts." },
    { icon: Lock, title: "Encrypted at rest", desc: "All sensitive data is encrypted with industry-standard AES-256." },
    { icon: KeyRound, title: "Row-level security", desc: "Database policies make sure you only ever see your own data." },
    { icon: ShieldCheck, title: "Audited stack", desc: "Built on hardened, continuously monitored cloud infrastructure." },
    { icon: Eye, title: "Transparent activity", desc: "Every claim, transfer, and login is logged and viewable." },
    { icon: AlertTriangle, title: "Anti-abuse engine", desc: "Real-time detection blocks fraud, multi-accounting and exploits." },
  ];
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20">
        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">Security you can feel</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">Your account, identity, and rewards are protected end-to-end.</p>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <div key={i.title} className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
              <i.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-lg font-semibold">{i.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{i.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}