import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Users, Trophy, ShieldCheck, ArrowRight, Sparkles, Download, Cpu, Zap, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/novajx-mark.png";
import { CoinIcon } from "@/components/CoinIcon";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NovaJX — Collect Daily Rewards | Earn Digital Credits" },
      { name: "description", content: "Join NovaJX and collect daily NJX rewards. Invite friends and earn RNT referral tokens. Secure KYC verification." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <XRBackground />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative inline-flex h-9 w-9 items-center justify-center">
            <span className="absolute inset-0 animate-logo-spin rounded-full border border-primary/40" />
            <span className="absolute inset-[-4px] animate-logo-spin-rev rounded-full border border-primary/20" />
            <img src={logo} alt="NovaJX" width={28} height={28} className="relative h-7 w-7 object-contain drop-shadow-[0_0_8px_oklch(0.92_0.18_92/0.6)]" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight sm:text-xl">NovaJX</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href="/downloads/NovaJX.apk" download>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download App</span>
              <span className="sm:hidden">App</span>
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/signin" search={{ redirect: "/dashboard" }}>Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-elegant">
            <Link to="/signup" search={{ ref: "" }}>Get started</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-4 pt-10 pb-16 text-center sm:px-6 sm:pt-16 sm:pb-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" /> Claim 2 NJX every 24 hours
        </div>

        <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Earn digital credits,{" "}
          <span
            className="bg-gradient-gold bg-clip-text"
            style={{ WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text" }}
          >
            from your phone
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          NovaJX is a digital rewards platform. Collect 2 NJX every 24 hours — one tap a day, no hardware, no fees.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 w-full gap-2 bg-gradient-primary px-8 text-primary-foreground shadow-elegant sm:w-auto">
            <Link to="/signup" search={{ ref: "" }}>Start collecting free <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 w-full gap-2 border-primary/40 px-8 backdrop-blur-sm sm:w-auto">
            <a href="/downloads/NovaJX.apk" download>
              <Download className="h-4 w-4" /> Download App
            </a>
          </Button>
        </div>

        <HeroCoin />

        <MiningStats />
      </section>

      <LivePrices />

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {[
            { icon: Gift, title: "One-tap rewards", desc: "Collect 2 NJX every 24 hours. No effort, no battery drain." },
            { icon: Users, title: "Invite & earn RNT", desc: "Get 1 RNT for every friend who joins with your code." },
            { icon: ShieldCheck, title: "KYC secure", desc: "Manual KYC review for verified accounts. Your account, protected." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-soft backdrop-blur-sm transition-smooth hover:border-primary/30 hover:shadow-elegant"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-4 pb-24 text-center sm:px-6">
        <Trophy className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Collect. Invite. Climb the ranks.</h2>
        <p className="mt-3 text-muted-foreground">Early collectors earn the most. Join now and lock in your rank.</p>
        <Button asChild size="lg" className="mt-7 h-12 bg-gradient-primary px-8 text-primary-foreground shadow-elegant">
          <Link to="/signup" search={{ ref: "" }}>Create free account</Link>
        </Button>
      </section>

      <footer className="relative z-10 border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <p className="mx-auto max-w-2xl px-4">
          Novajx is a digital rewards platform. NJX credits are virtual and used inside the app only.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} NovaJX</p>
      </footer>
    </div>
  );
}

function XRBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.84 0.18 88 / 0.25) 1px, transparent 1px), linear-gradient(90deg, oklch(0.84 0.18 88 / 0.25) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
        }}
      />
      {/* orbs */}
      <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 animate-orb-float rounded-full bg-gradient-gold opacity-20 blur-3xl" />
      <div className="absolute bottom-0 right-[-10%] h-[420px] w-[420px] animate-orb-float-rev rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-1/3 left-[-10%] h-[360px] w-[360px] animate-orb-float rounded-full bg-primary/10 blur-3xl" />
      {/* scanlines */}
      <div className="absolute inset-0 animate-scan opacity-[0.06] [background:repeating-linear-gradient(0deg,transparent_0,transparent_3px,oklch(0.92_0.18_92)_3px,oklch(0.92_0.18_92)_4px)]" />
    </div>
  );
}

function HeroCoin() {
  return (
    <div className="relative mx-auto mt-16 flex h-[260px] w-[260px] items-center justify-center sm:mt-20 sm:h-[320px] sm:w-[320px]">
      <div className="absolute inset-0 animate-orbit-slow rounded-full border border-primary/30" />
      <div className="absolute inset-4 animate-orbit-rev rounded-full border border-primary/20" />
      <div className="absolute inset-10 animate-orbit-slow rounded-full border border-dashed border-primary/30" />
      <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 animate-orbit-dot rounded-full bg-primary shadow-[0_0_12px_oklch(0.92_0.18_92)]" />
      <div className="absolute inset-0 animate-coin-pulse rounded-full" />
      <CoinIcon size={160} className="relative shadow-glow" />
    </div>
  );
}

function MiningStats() {
  const [hashrate, setHashrate] = useState(842.31);
  const [miners, setMiners] = useState(128_447);
  const [blocks, setBlocks] = useState(91_204);

  useEffect(() => {
    const id = setInterval(() => {
      setHashrate((h) => +(h + (Math.random() - 0.4) * 4).toFixed(2));
      setMiners((m) => m + Math.floor(Math.random() * 5));
      setBlocks((b) => b + (Math.random() > 0.7 ? 1 : 0));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const stats = [
    { icon: Cpu, label: "AI Hashrate", value: `${hashrate.toFixed(2)} TH/s`, tint: "text-primary" },
    { icon: Activity, label: "Active Miners", value: miners.toLocaleString(), tint: "text-gold" },
    { icon: Zap, label: "Blocks Today", value: blocks.toLocaleString(), tint: "text-success" },
  ];

  return (
    <div className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-card/50 p-4 text-left backdrop-blur-md transition-smooth hover:border-primary/50"
        >
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.label}</span>
            <s.icon className={`h-4 w-4 ${s.tint}`} />
          </div>
          <div className="mt-2 font-display text-xl font-bold tabular-nums sm:text-2xl">{s.value}</div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Live AI mining
          </div>
        </div>
      ))}
    </div>
  );
}

type Price = { id: string; symbol: string; name: string; price: number; change: number };

function LivePrices() {
  const [prices, setPrices] = useState<Price[]>([
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 0, change: 0 },
    { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 0, change: 0 },
    { id: "solana", symbol: "SOL", name: "Solana", price: 0, change: 0 },
    { id: "binancecoin", symbol: "BNB", name: "BNB", price: 0, change: 0 },
    { id: "ripple", symbol: "XRP", name: "XRP", price: 0, change: 0 },
    { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", price: 0, change: 0 },
  ]);

  useEffect(() => {
    let alive = true;
    const fetchPrices = async () => {
      try {
        const ids = "bitcoin,ethereum,solana,binancecoin,ripple,dogecoin";
        const r = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
        );
        const j = await r.json();
        if (!alive) return;
        setPrices((prev) =>
          prev.map((p) => ({
            ...p,
            price: j[p.id]?.usd ?? p.price,
            change: j[p.id]?.usd_24h_change ?? p.change,
          })),
        );
      } catch {
        /* ignore */
      }
    };
    fetchPrices();
    const id = setInterval(fetchPrices, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const row = [...prices, ...prices];

  return (
    <section className="relative z-10 mx-auto mb-20 max-w-6xl px-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Live crypto prices</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          Streaming
        </span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/40 py-4 backdrop-blur-md [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max animate-ticker gap-3 pr-3">
          {row.map((p, i) => {
            const up = p.change >= 0;
            return (
              <div
                key={`${p.id}-${i}`}
                className="flex min-w-[200px] items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 px-4 py-2.5"
              >
                <div>
                  <div className="font-display text-sm font-semibold">{p.symbol}</div>
                  <div className="text-[10px] text-muted-foreground">{p.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm tabular-nums">
                    {p.price ? `$${p.price.toLocaleString(undefined, { maximumFractionDigits: p.price < 1 ? 4 : 2 })}` : "—"}
                  </div>
                  <div className={`flex items-center justify-end gap-0.5 text-[10px] tabular-nums ${up ? "text-success" : "text-destructive"}`}>
                    {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {p.change ? `${up ? "+" : ""}${p.change.toFixed(2)}%` : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
