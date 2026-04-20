import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtNJX, maskName } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/leaderboard")({
  component: Leaderboard,
  head: () => ({ meta: [{ title: "Leaderboard — Top NovaJX miners" }] }),
});

function Leaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("active_referrals", { ascending: false })
        .order("referral_earnings", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-screen bg-gradient-hero pb-12">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 gap-1.5"><Link to="/"><ArrowLeft className="h-4 w-4" /> Home</Link></Button>
        <div className="mb-6 text-center">
          <Trophy className="mx-auto h-12 w-12 text-gold" />
          <h1 className="mt-3 font-display text-3xl font-bold">Top Miners</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ranked by active referrals & earnings</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {data?.map((row, i) => (
              <div key={row.user_id} className={`flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft ${i < 3 ? "ring-2 ring-gold/30" : ""}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full font-display font-bold ${i === 0 ? "bg-gradient-gold text-gold-foreground" : i < 3 ? "bg-gold/20 text-gold-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{maskName(row.full_name || "")}</p>
                  <p className="text-xs text-muted-foreground">{row.country || "—"} · {row.active_referrals} active</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-primary">{fmtNJX(row.referral_earnings, 2)}</p>
                  <p className="text-xs text-muted-foreground">NJX</p>
                </div>
              </div>
            ))}
            {!data?.length && <p className="py-12 text-center text-sm text-muted-foreground">No miners yet — be the first!</p>}
          </div>
        )}
      </div>
    </div>
  );
}
