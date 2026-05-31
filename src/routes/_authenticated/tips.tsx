import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Lightbulb, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/tips")({
  component: TipsPage,
});

interface Tip { id: string; title: string; content: string; created_at: string; author_id: string; }

function TipsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();

  const { data: tips, isLoading } = useQuery({
    queryKey: ["tips"],
    queryFn: async () => {
      const { data, error } = await supabase.from("health_tips").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tip[];
    },
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function postTip(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("health_tips").insert({ author_id: user.id, title, content });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tip published");
    setTitle(""); setContent("");
    qc.invalidateQueries({ queryKey: ["tips"] });
    qc.invalidateQueries({ queryKey: ["tip-count"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this tip?")) return;
    const { error } = await supabase.from("health_tips").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tips"] });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Health tips</h1>
        <p className="mt-1 text-muted-foreground">Daily oral-health guidance from your dental care team.</p>
      </div>

      {role === "staff" && (
        <form onSubmit={postTip} className="rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="font-semibold">Post a new tip</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="t-title">Title</Label>
              <Input id="t-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-content">Tip</Label>
              <Textarea id="t-content" required rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="mt-4" disabled={busy}>
            <Send className="mr-1.5 h-4 w-4" /> {busy ? "Publishing…" : "Publish tip"}
          </Button>
        </form>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && tips?.length === 0 && (
          <div className="col-span-full rounded-2xl border bg-card p-10 text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No tips published yet.</p>
          </div>
        )}
        {tips?.map((t) => (
          <article key={t.id} className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
                <Lightbulb className="h-4 w-4" />
              </div>
              {role === "staff" && (
                <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <h3 className="mt-3 font-semibold">{t.title}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.content}</p>
            <p className="mt-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
