import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/novajx-logo.png";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPage,
  head: () => ({ meta: [{ title: "Reset password — NovaJX" }] }),
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else toast.success("If that email exists, a reset link has been sent.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={logo} alt="NovaJX" width={40} height={40} className="h-10 w-10" />
          <span className="font-display text-2xl font-bold">NovaJX</span>
        </Link>
        <div className="rounded-2xl border border-border/60 bg-card p-7 shadow-elegant">
          <h1 className="font-display text-2xl font-bold">Reset password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground h-11">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm">
            <Link to="/signin" search={{ redirect: "/dashboard" }} className="text-primary hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
