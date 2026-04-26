import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ArrowLeft } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/terms")({
  component: () => <RequireAuth><AppShell><TermsPage /></AppShell></RequireAuth>,
  head: () => ({
    meta: [
      { title: "Terms & Conditions — NovaJX" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Platform Nature",
    body: (
      <p>
        NovaJX is a digital rewards platform. NJX credits are virtual and are
        used <em>inside</em> the app only.
      </p>
    ),
  },
  {
    title: "2. No Financial Claims",
    body: <p>NovaJX does not guarantee any financial returns. NJX is not real currency or cryptocurrency.</p>,
  },
  {
    title: "3. User Responsibilities",
    body: (
      <ul className="ml-5 list-disc space-y-1">
        <li>Provide accurate information.</li>
        <li>Do not misuse the platform.</li>
        <li>Do not attempt to exploit system features.</li>
      </ul>
    ),
  },
  {
    title: "4. KYC Verification",
    body: <p>Certain features may require identity verification. Providing false information may result in account restriction.</p>,
  },
  {
    title: "5. Wallet & Transfers",
    body: <p>Users can transfer NJX credits inside the platform. All transactions are recorded and monitored for security.</p>,
  },
  {
    title: "6. Account Control",
    body: <p>NovaJX reserves the right to suspend or terminate accounts that violate policies.</p>,
  },
  {
    title: "7. Changes to Terms",
    body: <p>We may update these terms at any time. Continued use of the app means you accept updated terms.</p>,
  },
];

function TermsPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-primary p-6 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7" />
          <div>
            <h1 className="font-display text-2xl font-bold">Terms & Conditions</h1>
            <p className="text-sm opacity-80">Please read carefully before using NovaJX</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <p className="text-sm text-muted-foreground">
          By using NovaJX, you agree to the following terms:
        </p>

        <div className="mt-5 space-y-5">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-base font-bold">{s.title}</h2>
              <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</div>
            </section>
          ))}
        </div>

        <p className="mt-6 rounded-2xl bg-muted/60 p-4 text-center text-sm font-medium">
          By using NovaJX, you agree to follow these terms and conditions.
        </p>
      </div>

      <Link
        to={"/profile" as any}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card py-3.5 text-sm font-semibold transition-smooth hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Profile
      </Link>
    </div>
  );
}