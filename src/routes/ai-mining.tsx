import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { Button } from "@/components/ui/button";
import { Cpu, Brain, Zap, Activity, Layers } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/ai-mining")({
  head: () => ({
    meta: [
      { title: "Mining — NovaJX" },
      { name: "description", content: "How NovaJX uses an adaptive engine to distribute NJX fairly and efficiently across millions of mobile devices." },
      { property: "og:title", content: "NovaJX Mining" },
      { property: "og:description", content: "Adaptive mining engine for fair, low-energy daily distribution." },
    ],
  }),
  component: AIMiningPage,
});

function AIMiningPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, []);
  const stats = [
    { icon: Cpu, label: "Hashrate", value: `${(842 + (tick % 9) * 1.3).toFixed(2)} TH/s` },
    { icon: Activity, label: "Active miners", value: (128_447 + tick).toLocaleString() },
    { icon: Layers, label: "Epochs", value: `${1240 + Math.floor(tick / 4)}` },
  ];
  const steps = [
    { icon: Brain, title: "Adaptive model", desc: "An onboard model tunes claim difficulty to keep distribution fair across devices." },
    { icon: Zap, title: "Light & low-energy", desc: "Less than 1% battery per claim. No fans, no heat, no e-waste." },
    { icon: Cpu, title: "Verifiable rewards", desc: "Each claim is signed, audited and traceable across the network." },
  ];
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Mining, in your pocket</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg">NovaJX runs an adaptive engine that distributes NJX fairly across phones — no rigs, no waste.</p>

      </section>
      <section className="mx-auto mb-12 grid max-w-4xl gap-3 px-4 sm:grid-cols-3 sm:px-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-primary/20 bg-card/50 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold tabular-nums">{s.value}</div>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild size="lg" className="h-12 bg-gradient-primary px-8 text-primary-foreground shadow-elegant">
            <Link to="/signup" search={{ ref: "" }}>Start mining</Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}