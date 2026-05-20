import { Link } from "@tanstack/react-router";
import { Download, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/novajx-mark.png";

const NAV = [
  { to: "/about", label: "About" },
  { to: "/features", label: "Features" },
  { to: "/ai-mining", label: "Mining" },
  { to: "/security", label: "Security" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/tokenomics", label: "Tokenomics" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function XRBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden grain">
      {/* Aurora gradient mesh */}
      <div className="absolute inset-0 aurora-mesh opacity-80" />
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.84 0.18 88 / 0.22) 1px, transparent 1px), linear-gradient(90deg, oklch(0.84 0.18 88 / 0.22) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
        }}
      />
      <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 animate-orb-float rounded-full bg-gradient-gold opacity-20 blur-3xl" />
      <div className="absolute bottom-0 right-[-10%] h-[420px] w-[420px] animate-orb-float-rev rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-1/3 left-[-10%] h-[360px] w-[360px] animate-orb-float rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute inset-0 animate-scan opacity-[0.06] [background:repeating-linear-gradient(0deg,transparent_0,transparent_3px,oklch(0.92_0.18_92)_3px,oklch(0.92_0.18_92)_4px)]" />
    </div>
  );
}

function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = (h.scrollHeight - h.clientHeight) || 1;
      setP(h.scrollTop / max);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-primary via-gold to-primary shadow-[0_0_12px_oklch(0.92_0.18_92/0.7)]"
        style={{ width: `${p * 100}%`, transition: "width 80ms linear" }}
      />
    </div>
  );
}

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? "bg-background/60 backdrop-blur-xl border-b border-border/60" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative inline-flex h-9 w-9 items-center justify-center">
            <span className="absolute inset-0 animate-logo-spin rounded-full border border-primary/40" />
            <span className="absolute inset-[-4px] animate-logo-spin-rev rounded-full border border-primary/20" />
            <img src={logo} alt="NovaJX" width={28} height={28} className="relative h-7 w-7 object-contain drop-shadow-[0_0_8px_oklch(0.92_0.18_92/0.6)]" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight sm:text-xl">NovaJX</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "text-primary" }}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-smooth hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button asChild size="sm" variant="outline" className="hidden gap-1.5 sm:inline-flex">
            <a href="/downloads/NovaJX.apk" download>
              <Download className="h-4 w-4" /> App
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/signin" search={{ redirect: "/dashboard" }}>Sign in</Link>
          </Button>
          <Button asChild size="sm" className="relative overflow-hidden bg-gradient-primary text-primary-foreground shadow-elegant">
            <Link to="/signup" search={{ ref: "" }}>Get started</Link>
          </Button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="mx-4 mb-4 grid gap-1 rounded-2xl border border-border/60 bg-card/80 p-3 backdrop-blur-md lg:hidden">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
            <Button asChild size="sm" variant="outline">
              <a href="/downloads/NovaJX.apk" download><Download className="h-4 w-4" /> App</a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/signin" search={{ redirect: "/dashboard" }}>Sign in</Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-border/60 py-10">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="NovaJX" className="h-7 w-7" />
            <span className="font-display text-base font-bold">NovaJX</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Next-gen mobile digital rewards. Mine NJX daily, anywhere.</p>
        </div>
        <FooterCol title="Product" links={[["/features","Features"],["/ai-mining","Mining"],["/tokenomics","Tokenomics"],["/roadmap","Roadmap"]]} />
        <FooterCol title="Company" links={[["/about","About"],["/security","Security"],["/contact","Contact"],["/faq","FAQ"]]} />
        <FooterCol title="Account" links={[["/signin","Sign in"],["/signup","Get started"]]} />
      </div>
      <p className="mt-8 px-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} NovaJX. NJX credits are virtual and used inside the app only.</p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold">{title}</h4>
      <ul className="mt-3 space-y-2">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="text-xs text-muted-foreground hover:text-foreground">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <ScrollProgress />
      <XRBackground />
      <MarketingHeader />
      <main className="relative z-10">{children}</main>
      <MarketingFooter />
    </div>
  );
}