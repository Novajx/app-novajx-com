import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { Mail, MessageCircle, Twitter, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — NovaJX" },
      { name: "description", content: "Get in touch with the NovaJX team for support, partnerships, or press inquiries." },
      { property: "og:title", content: "Contact NovaJX" },
      { property: "og:description", content: "Reach support, partnerships and press." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sending, setSending] = useState(false);
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Let's talk</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">Support, partnerships, press — we're here.</p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          {[
            { icon: Mail, label: "Email", value: "hello@novajx.com", href: "mailto:hello@novajx.com" },
            { icon: MessageCircle, label: "Telegram", value: "@novajx", href: "https://t.me/novajx" },
            { icon: Twitter, label: "Twitter / X", value: "@novajx", href: "https://x.com/novajx" },
          ].map((c) => (
            <a key={c.label} href={c.href} className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm transition-smooth hover:border-primary/40">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <c.icon className="h-4 w-4" />
              </span>
              <span>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{c.label}</div>
                <div className="font-display text-sm font-semibold">{c.value}</div>
              </span>
            </a>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSending(true);
            setTimeout(() => {
              setSending(false);
              toast.success("Message sent — we'll reply within 24h.");
              (e.target as HTMLFormElement).reset();
            }, 700);
          }}
          className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required placeholder="you@example.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" required rows={5} placeholder="How can we help?" />
          </div>
          <Button type="submit" disabled={sending} className="w-full gap-2 bg-gradient-primary text-primary-foreground shadow-elegant">
            <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send message"}
          </Button>
        </form>
      </section>
    </MarketingShell>
  );
}