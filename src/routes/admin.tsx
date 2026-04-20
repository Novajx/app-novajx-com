import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: () => <RequireAuth requireAdmin><AppShell><AdminPage /></AppShell></RequireAuth>,
  head: () => ({ meta: [{ title: "Admin — NovaJX" }] }),
});

function AdminPage() {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-soft">
      <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
      <h1 className="mt-3 font-display text-2xl font-bold">Admin Panel</h1>
      <p className="mt-2 text-sm text-muted-foreground">Full admin dashboard (Users, KYC reviews, Withdrawals, Settings) coming in next update.</p>
    </div>
  );
}
