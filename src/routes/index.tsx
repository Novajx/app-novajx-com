import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Pickaxe, Users, Trophy, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/novajx-logo.png";
import { CoinIcon } from "@/components/CoinIcon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NovaJX — Mine NJX Coins Daily | Next-Gen Mobile Crypto" },
      { name: "description", content: "Join NovaJX and mine NJX coins daily. Invite friends and earn 0.5 NJX per friend's mining claim. KYC secure withdrawals." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <img src={logo} alt="NovaJX logo" width={36} height={36} className="h-9 w-9" />
          <span className="font-display text-xl font-bold tracking-tight">NovaJX</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/signin" search={{ redirect: "/dashboard" }}>Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-elegant">
            <Link to="/signup" search={{ ref: "" }}>Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-12 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Now mining — claim 2 NJX every 24 hours
          </div>

          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight md:text-7xl">
            The future of{" "}
            <span
              className="text-transparent"
              style={{
                backgroundImage: "var(--gradient-primary)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              mobile mining
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            NovaJX (NJX) lets anyone mine crypto from their phone — no hardware, no electricity, no fees. Just one tap a day.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-elegant gap-2 h-12 px-8">
              <Link to="/signup" search={{ ref: "" }}>Start mining free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8">
              <Link to="/leaderboard">View leaderboard</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-16 flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 animate-coin-pulse rounded-full" />
            <CoinIcon size={140} className="text-4xl shadow-glow" />
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: Pickaxe, title: "One-tap mining", desc: "Claim 2 NJX every 24 hours. No effort, no battery drain." },
            { icon: Users, title: "Earn from friends", desc: "Get 0.5 NJX bonus every time a referral mines." },
            { icon: ShieldCheck, title: "KYC secure", desc: "Manual KYC review before withdrawal. Your account, protected." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-smooth hover:shadow-elegant"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 text-center">
        <Trophy className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-4 text-3xl font-bold tracking-tight">Mine. Invite. Climb the leaderboard.</h2>
        <p className="mt-3 text-muted-foreground">The earliest miners earn the most. Join now and lock in your rank.</p>
        <Button asChild size="lg" className="mt-6 bg-gradient-primary text-primary-foreground shadow-elegant h-12 px-8">
          <Link to="/signup" search={{ ref: "" }}>Create free account</Link>
        </Button>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NovaJX. Mine smart.
      </footer>
    </div>
  );
}
