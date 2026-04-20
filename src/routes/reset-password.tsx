import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/novajx-logo.png";

export const Route = createFileRoute("/reset-password")({
  component: ResetPage,
  head: () => ({ meta: [{ title: "Set new password — NovaJX" }] }),
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated! Please sign in.");
    navigate({ to: "/signin", search: { redirect: "/dashboard" } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={logo} alt="NovaJX" width={40} height={40} className="h-10 w-10" />
          <span className="font-display text-2xl font-bold">NovaJX</span>
        </Link>
        <div className="rounded-2xl border border-border/60 bg-card p-7 shadow-elegant">
          <h1 className="font-display text-2xl font-bold">Set new password</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground h-11">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
