import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Users, Trophy, ShieldCheck, ArrowRight, Sparkles, Download, Cpu, Zap, Activity, TrendingUp, TrendingDown, Brain, Lock, Globe2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoinIcon } from "@/components/CoinIcon";
import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { MarketingShell } from "@/components/MarketingShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NovaJX — Next-Gen Crypto, Mined From Your Phone" },
      { name: "description", content: "NovaJX is a next-generation mobile crypto network. Mine NJX daily with a single tap — no rigs, no fees, no hardware." },
      { property: "og:title", content: "NovaJX — Next-Gen Crypto" },
      { property: "og:description", content: "A mobile-distributed crypto network. Mine NJX daily, anywhere." },

    ],
  }),
  component: Landing,
});

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: "easeOut" },
  }),
};

function Landing() {
  return (
    <MarketingShell>
      <Hero />
      <LivePrices />
      <PartnerMarquee />
      <FeatureGrid />
      <HowItWorks />
      <FinalCTA />
    </MarketingShell>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden"
          />


          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-6 text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl"
          >
            The next-gen <span className="text-shine">mobile crypto</span> network, mined from your phone.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0"
          >
            NovaJX runs an adaptive engine that distributes NJX fairly across millions of devices. No rigs. No fees. One tap a day.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start"
          >
            <Button asChild size="lg" className="group relative h-12 w-full gap-2 overflow-hidden bg-gradient-primary px-8 text-primary-foreground shadow-elegant animate-pulse-glow sm:w-auto">
              <Link to="/signup" search={{ ref: "" }}>
                <span className="relative z-10 flex items-center gap-2">Register <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-beam" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 w-full gap-2 border-primary/40 bg-background/40 px-8 backdrop-blur-sm sm:w-auto">
              <a href="/downloads/NovaJX.apk" download>
                <Download className="h-4 w-4" /> Download App
              </a>
            </Button>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-8 grid max-w-md grid-cols-3 gap-4 lg:mx-0"
          >
            <Stat label="Miners" target={128447} suffix="+" />
            <Stat label="Countries" target={180} suffix="+" />
            <Stat label="Claims / day" target={2.4} suffix="M" decimals={1} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative mx-auto w-full max-w-md"
        >
          <HeroCoin />
          <FloatingCard className="absolute -left-2 top-6 sm:-left-6" icon={Brain} title="Epoch" value="#1,284" sub="adaptive" delay={0.3} />
          <FloatingCard className="absolute -right-2 top-1/3 sm:-right-6" icon={Cpu} title="Hashrate" value="842 TH/s" sub="live" delay={0.55} />
          <FloatingCard className="absolute bottom-4 left-1/2 -translate-x-1/2" icon={Lock} title="Secured" value="Zero-knowledge" sub="audited" delay={0.8} />
          {!reduce && <MiningStats />}
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ label, target, suffix = "", decimals = 0 }: { label: string; target: number; suffix?: string; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setV(target * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  const formatted = decimals
    ? v.toFixed(decimals)
    : Math.round(v).toLocaleString();
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-left backdrop-blur-sm">
      <div className="font-display text-xl font-bold tabular-nums text-foreground">{formatted}{suffix}</div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}

function FloatingCard({ className = "", icon: Icon, title, value, sub, delay = 0 }: { className?: string; icon: React.ComponentType<{ className?: string }>; title: string; value: string; sub: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      className={`holo-border glass hidden rounded-xl px-3 py-2 shadow-elegant sm:block ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
          <div className="font-display text-sm font-bold tabular-nums">{value}</div>
          <div className="text-[9px] text-muted-foreground">{sub}</div>
        </div>
      </div>
    </motion.div>
  );
}

const FEATURES = [
  { icon: Brain, title: "Adaptive engine", desc: "Onboard models tune claim difficulty in real time to keep distribution fair." },
  { icon: Cpu, title: "Zero hardware", desc: "Less than 1% battery per claim. No rigs, no fans, no e-waste." },
  { icon: Lock, title: "Zero-knowledge security", desc: "Audited signatures, on-device key custody, KYC behind ZK proofs." },
  { icon: Globe2, title: "Global throughput", desc: "180+ countries. Offline-tolerant claims sync the moment you reconnect." },
  { icon: Users, title: "Referral economy", desc: "Earn 1 RNT for every friend who joins with your code." },
  { icon: Rocket, title: "Mainnet ready", desc: "Predictable emissions and on-chain–style accounting from day one." },
];

function FeatureGrid() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3 w-3" /> Capabilities
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Enterprise-grade. Mobile-native.</h2>
        <p className="mt-3 text-muted-foreground">A full crypto stack — distributed globally, designed for the next billion users.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: (i % 3) * 0.08 }}
            className="holo-border hover-lift group relative rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm"
          >
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elegant">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Download, title: "Download NovaJX", desc: "Install the app on Android in seconds. iOS coming soon." },
    { icon: ShieldCheck, title: "Verify with one tap", desc: "Lightweight KYC keeps the network honest — no spreadsheets." },
    { icon: Cpu, title: "Claim daily NJX", desc: "Open the app. Tap. Our engine credits your wallet instantly." },
    { icon: Users, title: "Invite & earn RNT", desc: "Get 1 RNT for every verified friend. Compounds forever." },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">From install to first claim in 60 seconds.</h2>
      </div>
      <div className="relative grid gap-6 md:grid-cols-4">
        <div className="pointer-events-none absolute inset-x-0 top-6 hidden h-px md:block">
          <div className="mx-12 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            className="relative rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm"
          >
            <div className="relative z-10 mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-background text-primary shadow-elegant">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="absolute right-5 top-5 font-display text-3xl font-bold text-muted-foreground/20">0{i + 1}</div>
            <h3 className="font-display text-base font-semibold">{s.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function PartnerMarquee() {
  const items = ["EDGE · COMPUTE", "ZERO-KNOWLEDGE", "MOBILE-NATIVE", "EDGE INFERENCE", "ADAPTIVE PoW", "180+ COUNTRIES", "AUDITED", "OPEN PROTOCOL"];
  const row = [...items, ...items];
  return (
    <section className="relative z-10 mx-auto mb-10 max-w-7xl px-4 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/30 py-4 backdrop-blur-md [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee gap-10 pr-10">
          {row.map((t, i) => (
            <span key={i} className="font-display text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <div className="holo-border relative overflow-hidden rounded-3xl border border-primary/30 bg-card/40 px-6 py-14 text-center backdrop-blur-md sm:py-20">
        <div className="pointer-events-none absolute inset-0 aurora-mesh opacity-50" />
        <div className="relative">
          <Trophy className="mx-auto h-10 w-10 text-gold drop-shadow-[0_0_12px_oklch(0.92_0.18_92/0.7)]" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">Lock in your rank. <span className="text-shine">Early miners earn the most.</span></h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Join 128k+ miners distributing NJX across the world. The protocol rewards the first.</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 bg-gradient-primary px-8 text-primary-foreground shadow-elegant animate-pulse-glow">
              <Link to="/signup" search={{ ref: "" }}>Create free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-primary/40 px-8 backdrop-blur-sm">
              <Link to="/ai-mining">How mining works</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroCoin() {
  return (
    <div className="relative mx-auto flex h-[300px] w-[300px] items-center justify-center sm:h-[380px] sm:w-[380px]">
      <div className="absolute inset-[-20%] rounded-full bg-gradient-gold opacity-20 blur-3xl" />
      <div className="absolute inset-0 animate-orbit-slow rounded-full border border-primary/30" />
      <div className="absolute inset-4 animate-orbit-rev rounded-full border border-primary/20" />
      <div className="absolute inset-10 animate-orbit-slow rounded-full border border-dashed border-primary/30" />
      <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 animate-orbit-dot rounded-full bg-primary shadow-[0_0_12px_oklch(0.92_0.18_92)]" />
      <div className="absolute inset-0 animate-coin-pulse rounded-full" />
      <CoinIcon size={200} className="relative shadow-glow" />
    </div>
  );
}

function MiningStats() {
  // (kept for backwards reference; superseded by Hero floating cards)
  return null;
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
    <section className="relative z-10 mx-auto mb-12 max-w-7xl px-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold sm:text-2xl">Live market</h2>
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
