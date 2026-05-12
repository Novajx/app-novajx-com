import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/novajx-logo.png";

const schema = z.object({
  full_name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  password: z
    .string()
    .min(8, "Min 8 characters")
    .max(72)
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[0-9]/, "Must include a number"),
  country: z.string().trim().min(2).max(60),
  referral_code: z.string().trim().max(20).optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;
const REFERRAL_STORAGE_KEY = "novajx_pending_referral_code";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref : "",
  }),
  component: SignUpPage,
  head: () => ({ meta: [{ title: "Create your NovaJX account" }] }),
});

function SignUpPage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { referral_code: ref || "" },
  });

  const onGoogle = async () => {
    const referralCode = watch("referral_code")?.trim();
    if (referralCode) localStorage.setItem(REFERRAL_STORAGE_KEY, referralCode);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  };

  useEffect(() => { if (ref) setValue("referral_code", ref); }, [ref, setValue]);
  useEffect(() => { if (!loading && user) navigate({ to: "/dashboard" }); }, [user, loading, navigate]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: data.full_name,
          country: data.country,
          referral_code: data.referral_code || null,
        },
      },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    toast.success("Account created! Welcome to NovaJX.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src={logo} alt="NovaJX" width={40} height={40} className="h-12 w-12 object-contain mx-auto" />
          <span className="font-display text-2xl font-bold">NovaJX</span>
        </Link>
        <div className="rounded-2xl border border-border/60 bg-card p-7 shadow-elegant">
          <h1 className="font-display text-2xl font-bold">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start mining NJX in 30 seconds.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" {...register("full_name")} className="mt-1.5" />
              {errors.full_name && <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} className="mt-1.5" />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} className="mt-1.5" />
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" placeholder="Pakistan" {...register("country")} className="mt-1.5" />
              {errors.country && <p className="mt-1 text-xs text-destructive">{errors.country.message}</p>}
            </div>
            <div>
              <Label htmlFor="referral_code">Referral code <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="referral_code" placeholder="NJXXXXXX" {...register("referral_code")} className="mt-1.5 uppercase" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground shadow-elegant h-11">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" onClick={onGoogle} className="w-full h-11">
            Continue with Google
          </Button>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/signin" search={{ redirect: "/dashboard" }} className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
