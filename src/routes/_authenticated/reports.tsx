import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Download, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

interface ReportRow {
  id: string; title: string; notes: string | null; file_path: string | null;
  patient_id: string; created_at: string;
}

function ReportsPage() {
  const { user, role } = useAuth();
  const qc = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", user?.id, role],
    queryFn: async () => {
      const q = supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (role === "patient") q.eq("patient_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data as ReportRow[];
    },
    enabled: !!user && !!role,
  });

  async function download(path: string) {
    const { data, error } = await supabase.storage.from("reports").createSignedUrl(path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function remove(r: ReportRow) {
    if (!confirm("Delete this report?")) return;
    if (r.file_path) await supabase.storage.from("reports").remove([r.file_path]);
    const { error } = await supabase.from("reports").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Report deleted");
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["report-count"] });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Dental reports</h1>
        <p className="mt-1 text-muted-foreground">
          {role === "staff" ? "Upload reports for patients in your care." : "Your dental reports from the clinic."}
        </p>
      </div>

      {role === "staff" && <UploadForm onUploaded={() => {
        qc.invalidateQueries({ queryKey: ["reports"] });
        qc.invalidateQueries({ queryKey: ["report-count"] });
      }} />}

      <div className="mt-8 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && reports?.length === 0 && (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No reports yet.</p>
          </div>
        )}
        {reports?.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-medium">{r.title}</h3>
              </div>
              {r.notes && <p className="mt-1 text-sm text-muted-foreground">{r.notes}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
                {role === "staff" && <> · Patient ID: <span className="font-mono">{r.patient_id.slice(0, 8)}…</span></>}
              </p>
            </div>
            <div className="flex gap-2">
              {r.file_path && (
                <Button size="sm" variant="outline" onClick={() => download(r.file_path!)}>
                  <Download className="mr-1.5 h-4 w-4" /> Download
                </Button>
              )}
              {role === "staff" && (
                <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let file_path: string | null = null;
      if (file) {
        const path = `${patientId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("reports").upload(path, file);
        if (upErr) throw upErr;
        file_path = path;
      }
      const { error } = await supabase.from("reports").insert({
        patient_id: patientId, uploaded_by: user.id, title, notes: notes || null, file_path,
      });
      if (error) throw error;
      toast.success("Report uploaded");
      setPatientId(""); setTitle(""); setNotes(""); setFile(null);
      (document.getElementById("file-input") as HTMLInputElement | null)?.value && ((document.getElementById("file-input") as HTMLInputElement).value = "");
      onUploaded();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <h2 className="font-semibold">Upload new report</h2>
      <p className="mt-1 text-sm text-muted-foreground">Securely share a report with a patient.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pid">Patient user ID</Label>
          <Input id="pid" required placeholder="UUID of patient account" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          <p className="text-xs text-muted-foreground">Ask the patient to share their account ID from their profile.</p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Report title</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Clinical notes</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="file-input">Attachment (PDF, image)</Label>
          <Input id="file-input" type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <Button type="submit" className="mt-4" disabled={busy}>
        <Upload className="mr-1.5 h-4 w-4" /> {busy ? "Uploading…" : "Upload report"}
      </Button>
    </form>
  );
}
