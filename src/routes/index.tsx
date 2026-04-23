import { createFileRoute, Link } from "@tanstack/react-router";
import { Pickaxe, Users, Trophy, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/novajx-mark.png";
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
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="NovaJX" width={36} height={36} className="h-9 w-9 rounded-lg" />
          <span className="font-display text-lg font-bold tracking-tight sm:text-xl">NovaJX</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/signin" search={{ redirect: "/dashboard" }}>Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground shadow-elegant">
            <Link to="/signup" search={{ ref: "" }}>Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-10 pb-16 text-center sm:px-6 sm:pt-16 sm:pb-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" /> Claim 2 NJX every 24 hours
        </div>

        <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Mine the future,{" "}
          <span
            className="bg-gradient-gold bg-clip-text"
            style={{ WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text" }}
          >
            from your phone
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          NovaJX (NJX) is the next-gen mobile crypto. No hardware, no electricity, no fees — just one tap a day.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 w-full gap-2 bg-gradient-primary px-8 text-primary-foreground shadow-elegant sm:w-auto">
            <Link to="/signup" search={{ ref: "" }}>Start mining free <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-12 w-full px-8 text-foreground hover:bg-primary/10 sm:w-auto">
            <Link to="/leaderboard">View leaderboard</Link>
          </Button>
        </div>

        <div className="mt-16 flex justify-center sm:mt-20">
          <div className="relative">
            <div className="absolute inset-0 animate-coin-pulse rounded-full" />
            <CoinIcon size={160} className="shadow-glow" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {[
            { icon: Pickaxe, title: "One-tap mining", desc: "Claim 2 NJX every 24 hours. No effort, no battery drain." },
            { icon: Users, title: "Earn from friends", desc: "Get 0.5 NJX bonus every time a referral mines." },
            { icon: ShieldCheck, title: "KYC secure", desc: "Manual KYC review before withdrawal. Your account, protected." },
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

      <section className="mx-auto max-w-3xl px-4 pb-24 text-center sm:px-6">
        <Trophy className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Mine. Invite. Climb the ranks.</h2>
        <p className="mt-3 text-muted-foreground">The earliest miners earn the most. Join now and lock in your rank.</p>
        <Button asChild size="lg" className="mt-7 h-12 bg-gradient-primary px-8 text-primary-foreground shadow-elegant">
          <Link to="/signup" search={{ ref: "" }}>Create free account</Link>
        </Button>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NovaJX. Mine smart.
      </footer>
    </div>
  );
}
