import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Upload, Loader2, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/kyc")({
  component: () => <RequireAuth><AppShell><KycPage /></AppShell></RequireAuth>,
  head: () => ({ meta: [{ title: "KYC Verification — NovaJX" }] }),
});

function KycPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: submission, isLoading } = useQuery({
    queryKey: ["kyc", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("kyc_submissions")
        .select("*")
        .eq("user_id", user!.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({ full_name: "", dob: "", country: "", id_number: "" });
  const [files, setFiles] = useState<{ id_front?: File; id_back?: File; selfie?: File }>({});

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!form.full_name || !form.dob || !form.country || !form.id_number) {
        throw new Error("Please fill all fields");
      }
      if (!files.id_front || !files.id_back || !files.selfie) {
        throw new Error("Please upload all 3 documents");
      }

      const upload = async (file: File, label: string) => {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${label}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
        if (error) throw error;
        return path;
      };

      const [id_front_url, id_back_url, selfie_url] = await Promise.all([
        upload(files.id_front, "id-front"),
        upload(files.id_back, "id-back"),
        upload(files.selfie, "selfie"),
      ]);

      const { error } = await supabase.from("kyc_submissions").insert({
        user_id: user.id,
        full_name: form.full_name,
        dob: form.dob,
        country: form.country,
        id_number: form.id_number,
        id_front_url,
        id_back_url,
        selfie_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("KYC submitted! Review takes 1–3 business days.");
      qc.invalidateQueries({ queryKey: ["kyc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  // Show status if a submission exists
  if (submission) {
    const cfg = {
      pending: { Icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", title: "Under Review", msg: "Your KYC is being reviewed. This usually takes 1–3 business days." },
      approved: { Icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", title: "Verified", msg: "You're fully verified and can withdraw funds." },
      rejected: { Icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", title: "Rejected", msg: submission.rejection_reason || "Your submission was rejected. Please re-submit." },
      not_submitted: { Icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted", title: "Not Submitted", msg: "Submit your KYC to enable withdrawals." },
    }[submission.status];

    return (
      <div className="space-y-4">
        <div className={`rounded-3xl border border-border/60 bg-card p-8 text-center shadow-soft`}>
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${cfg.bg}`}>
            <cfg.Icon className={`h-8 w-8 ${cfg.color}`} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">{cfg.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{cfg.msg}</p>

          <div className="mt-6 space-y-2 text-left text-sm">
            <Row label="Name" value={submission.full_name} />
            <Row label="DOB" value={submission.dob} />
            <Row label="Country" value={submission.country} />
            <Row label="ID Number" value={submission.id_number} />
            <Row label="Submitted" value={new Date(submission.submitted_at).toLocaleDateString()} />
          </div>

          {submission.status === "rejected" && (
            <button
              onClick={() => qc.setQueryData(["kyc", user?.id], null)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant"
            >
              Re-submit KYC
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border/60 bg-card p-7 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Verify Identity</h1>
            <p className="text-xs text-muted-foreground">Required to withdraw NJX</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Full Legal Name">
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="John Doe"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth">
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </Field>
            <Field label="Country">
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="United States"
              />
            </Field>
          </div>
          <Field label="Government ID Number">
            <input
              type="text"
              value={form.id_number}
              onChange={(e) => setForm({ ...form, id_number: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Passport / ID number"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FileField label="ID Front" file={files.id_front} onChange={(f) => setFiles({ ...files, id_front: f })} />
            <FileField label="ID Back" file={files.id_back} onChange={(f) => setFiles({ ...files, id_back: f })} />
            <FileField label="Selfie" file={files.selfie} onChange={(f) => setFiles({ ...files, selfie: f })} />
          </div>

          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="w-full rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-bounce hover:scale-[1.02] disabled:opacity-60"
          >
            {submit.isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Submit for Verification"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FileField({ label, file, onChange }: { label: string; file?: File; onChange: (f: File) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-background p-4 text-center transition-smooth hover:border-primary">
      <Upload className="h-5 w-5 text-muted-foreground" />
      <span className="text-xs font-medium">{label}</span>
      <span className="line-clamp-1 text-[10px] text-muted-foreground">{file?.name ?? "Tap to upload"}</span>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
