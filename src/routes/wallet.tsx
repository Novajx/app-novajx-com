import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/wallet")({
  component: () => <RequireAuth><AppShell><Page /></AppShell></RequireAuth>,
  head: () => ({ meta: [{ title: "Wallet — NovaJX" }] }),
});

function Page() {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-soft">
      <h1 className="font-display text-2xl font-bold capitalize">wallet</h1>
      <p className="mt-2 text-sm text-muted-foreground">Coming in next update — full wallet flow with all features wired up.</p>
    </div>
  );
}
