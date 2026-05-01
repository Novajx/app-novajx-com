import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/novajx-logo.png";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

// Only allow same-origin relative paths to prevent open-redirect attacks
function safeRedirect(target: string | undefined, fallback = "/dashboard"): string {
  if (!target || typeof target !== "string") return fallback;
  // Must start with a single "/" and not "//" or "/\" (protocol-relative)
  if (!target.startsWith("/")) return fallback;
  if (target.startsWith("//") || target.startsWith("/\\")) return fallback;
  // Block anything that looks like a URL scheme
  if (/^\/?[a-z]+:/i.test(target)) return fallback;
  return target;
}

export const Route = createFileRoute("/signin")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: safeRedirect(typeof s.redirect === "string" ? s.redirect : undefined),
  }),
  component: SignInPage,
  head: () => ({ meta: [{ title: "Sign in — NovaJX" }] }),
});

function SignInPage() {
  const { redirect: rawRedirect } = Route.useSearch();
  const redirect = safeRedirect(rawRedirect);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => { if (!loading && user) window.location.href = redirect; }, [user, loading, redirect]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(data);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back!");
    window.location.href = redirect;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={logo} alt="NovaJX" width={40} height={40} className="h-12 w-12 object-contain mx-auto" />
          <span className="font-display text-2xl font-bold">NovaJX</span>
        </Link>
        <div className="rounded-2xl border border-border/60 bg-card p-7 shadow-elegant">
          <h1 className="font-display text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue mining.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} className="mt-1.5" />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} className="mt-1.5" />
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground shadow-elegant h-11">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">Forgot password?</Link>
            <Link to="/signup" search={{ ref: "" }} className="font-medium text-primary hover:underline">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
