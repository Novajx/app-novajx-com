import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/MarketingShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — NovaJX" },
      { name: "description", content: "Answers to the most common questions about NovaJX mining, KYC, referrals, and security." },
      { property: "og:title", content: "NovaJX FAQ" },
      { property: "og:description", content: "Quick answers about mining, KYC, referrals and security." },
    ],
  }),
  component: FaqPage,
});

const ITEMS: [string, string][] = [
  ["Is NovaJX free?", "Yes. Creating an account and claiming your daily NJX is completely free — no purchase or hardware needed."],
  ["How does mining work?", "Tap once every 24 hours to claim 2 NJX. The engine handles fair distribution across the network."],
  ["Do I need KYC?", "KYC is required to withdraw or transfer larger balances. It's a quick manual review process."],
  ["How are referrals rewarded?", "You earn 1 RNT for every friend who joins using your referral code and completes signup."],
  ["Is NJX a cryptocurrency?", "NJX is a digital reward credit used inside the NovaJX network. Mainnet bridging is on the roadmap."],
  ["Which devices are supported?", "Any modern Android or iOS device with a current browser works. A native app is also available."],
  ["How is my data protected?", "All sensitive data is encrypted, access is gated by row-level security, and abuse is monitored continuously."],
];

function FaqPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-4 pt-12 pb-10 text-center sm:px-6 sm:pt-20">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Questions, answered</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground sm:text-lg">Everything you wanted to know about NovaJX.</p>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <Accordion type="single" collapsible className="rounded-2xl border border-border/60 bg-card/60 px-4 backdrop-blur-sm">
          {ITEMS.map(([q, a], i) => (
            <AccordionItem key={q} value={`item-${i}`} className="border-border/60">
              <AccordionTrigger className="text-left font-display text-base">{q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </MarketingShell>
  );
}