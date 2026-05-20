import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { CheckCircle2, Circle, Rocket } from "lucide-react";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap — NovaJX" },
      { name: "description", content: "Where NovaJX has been and where it's going — from launch to global mainnet and beyond." },
      { property: "og:title", content: "NovaJX Roadmap" },
      { property: "og:description", content: "From private beta to global mainnet." },
    ],
  }),
  component: RoadmapPage,
});

const PHASES = [
  { q: "Q1 2024", title: "Genesis", done: true, items: ["Private beta launch", "First 10k collectors", "Wallet v1"] },
  { q: "Q3 2024", title: "Liftoff", done: true, items: ["Public launch", "Referral RNT", "Manual KYC"] },
  { q: "Q2 2026", title: "AI Mining", done: false, items: ["Adaptive AI engine", "Live leaderboards", "Mobile app v2"] },
  { q: "Q4 2026", title: "Mainnet", done: false, items: ["Public mainnet", "Token bridging", "On-app governance"] },
  { q: "2027+", title: "Beyond", done: false, items: ["Merchant network", "Global payouts", "1B+ users"] },
];

function RoadmapPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20">
        <Rocket className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">The road to mainnet</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">A focused plan, shipped publicly, with the community.</p>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <ol className="relative space-y-6 border-l border-border/60 pl-6">
          {PHASES.map((p) => (
            <li key={p.q} className="relative">
              <span className="absolute -left-[33px] top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background">
                {p.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-3 w-3 text-muted-foreground" />}
              </span>
              <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{p.q}</span>
                  <span className={`text-[10px] rounded-full px-2 py-0.5 ${p.done ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}`}>{p.done ? "Shipped" : "In progress"}</span>
                </div>
                <h3 className="mt-1 font-display text-lg font-semibold">{p.title}</h3>
                <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                  {p.items.map((it) => <li key={it}>• {it}</li>)}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </MarketingShell>
  );
}