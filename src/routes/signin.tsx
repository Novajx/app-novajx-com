import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => { if (!loading && user) window.location.href = redirect; }, [user, loading, redirect]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword(data);
    setSubmitting(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        toast.error("Please verify your email before signing in.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    // Block banned users at the door
    const uid = signInData.user?.id;
    if (uid) {
      const { data: prof } = await supabase.from("profiles").select("banned").eq("id", uid).maybeSingle();
      if (prof?.banned) {
        await supabase.auth.signOut();
        toast.error("Your account has been suspended. Contact support.");
        return;
      }
    }
    toast.success("Welcome back!");
    window.location.href = redirect;
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${redirect}`,
    });
    if (result.error) {
      setGoogleLoading(false);
      toast.error(result.error.message || "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
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
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" onClick={handleGoogle} disabled={googleLoading} className="w-full h-11">
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
                  <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84Z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>
          <div className="mt-5 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">Forgot password?</Link>
            <Link to="/signup" search={{ ref: "" }} className="font-medium text-primary hover:underline">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
