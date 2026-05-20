import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { CoinIcon } from "@/components/CoinIcon";

export const Route = createFileRoute("/tokenomics")({
  head: () => ({
    meta: [
      { title: "Tokenomics — NovaJX" },
      { name: "description", content: "NJX supply, distribution, emissions and utility. Transparent tokenomics designed for long-term participation." },
      { property: "og:title", content: "NovaJX Tokenomics" },
      { property: "og:description", content: "Supply, distribution, emissions and utility for NJX." },
    ],
  }),
  component: TokenomicsPage,
});

const ALLOC = [
  { label: "Community mining", pct: 55, color: "oklch(0.84 0.18 88)" },
  { label: "Ecosystem & rewards", pct: 18, color: "oklch(0.72 0.18 75)" },
  { label: "Team", pct: 12, color: "oklch(0.6 0.18 60)" },
  { label: "Treasury", pct: 10, color: "oklch(0.5 0.12 70)" },
  { label: "Liquidity", pct: 5, color: "oklch(0.4 0.08 60)" },
];

function TokenomicsPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20">
        <div className="mx-auto mb-6 flex items-center justify-center">
          <CoinIcon size={88} className="shadow-glow" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">NJX tokenomics</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">Predictable supply, community-first distribution, transparent emissions.</p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Max supply", value: "10,000,000,000 NJX" },
            { label: "Initial emission", value: "2 NJX / claim" },
            { label: "Halvening", value: "Every 18 months" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.label}</div>
              <div className="mt-2 font-display text-xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Allocation</h2>
        <div className="mt-5 flex h-3 overflow-hidden rounded-full border border-border/60">
          {ALLOC.map((a) => (
            <div key={a.label} style={{ width: `${a.pct}%`, background: a.color }} />
          ))}
        </div>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {ALLOC.map((a) => (
            <li key={a.label} className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                {a.label}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">{a.pct}%</span>
            </li>
          ))}
        </ul>
      </section>
    </MarketingShell>
  );
}