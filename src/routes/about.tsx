import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { Button } from "@/components/ui/button";
import { Sparkles, Globe, Users, Rocket } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About NovaJX — The Mobile-First Digital Rewards Network" },
      { name: "description", content: "NovaJX is a mobile-first digital rewards network letting anyone mine NJX credits in seconds, daily, with zero hardware." },
      { property: "og:title", content: "About NovaJX" },
      { property: "og:description", content: "Discover the story, mission and team behind NovaJX." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const pillars = [
    { icon: Globe, title: "Global by default", desc: "180+ countries. One tap. No borders, no fees." },
    { icon: Users, title: "Community owned", desc: "Early collectors shape the protocol with on-app governance." },
    { icon: Rocket, title: "Built to scale", desc: "Designed for billions of light, low-energy daily claims." },
  ];
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 pt-12 pb-16 text-center sm:px-6 sm:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" /> Our mission
        </div>
        <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          A digital rewards network <span className="bg-gradient-gold bg-clip-text" style={{ WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text" }}>built for everyone</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          NovaJX makes earning digital credits effortless. No mining rigs, no gas fees, no jargon — just one tap a day from any phone.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From whitepaper to wallet</h2>
        <p className="mt-3 text-muted-foreground">Founded in 2024, NovaJX is on a mission to onboard the next billion users to digital ownership — by making it as simple as opening an app.</p>
        <Button asChild size="lg" className="mt-7 h-12 bg-gradient-primary px-8 text-primary-foreground shadow-elegant">
          <Link to="/signup" search={{ ref: "" }}>Join the mission</Link>
        </Button>
      </section>
    </MarketingShell>
  );
}