import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Lightbulb, MessageSquare, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, role } = useAuth();

  const { data: reportCount } = useQuery({
    queryKey: ["report-count", user?.id, role],
    queryFn: async () => {
      const q = supabase.from("reports").select("id", { count: "exact", head: true });
      if (role === "patient") q.eq("patient_id", user!.id);
      const { count } = await q;
      return count ?? 0;
    },
    enabled: !!user && !!role,
  });

  const { data: tipCount } = useQuery({
    queryKey: ["tip-count"],
    queryFn: async () => {
      const { count } = await supabase.from("health_tips").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {role === "staff" ? "Clinical workspace" : "Your dental portal"}
          </h1>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
          <Stethoscope className="h-3.5 w-3.5" /> {role === "staff" ? "Staff" : "Patient"} access
        </span>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat label={role === "staff" ? "Reports in system" : "Your reports"} value={reportCount ?? "—"} icon={FileText} />
        <Stat label="Health tips published" value={tipCount ?? "—"} icon={Lightbulb} />
        {role === "patient" && <Stat label="AI assistant" value="Online" icon={MessageSquare} />}
        {role === "staff" && <Stat label="Role" value="Care team" icon={Stethoscope} />}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ActionCard
          to="/reports"
          title={role === "staff" ? "Upload a report" : "View my reports"}
          body={role === "staff" ? "Send a new dental report securely to a patient." : "Review your latest dental reports from your clinician."}
          icon={FileText}
        />
        <ActionCard
          to="/tips"
          title={role === "staff" ? "Post a health tip" : "Read health tips"}
          body={role === "staff" ? "Share oral-health guidance with all patients." : "Daily care tips from our doctors and nurses."}
          icon={Lightbulb}
        />
        {role === "patient" && (
          <ActionCard
            to="/chat"
            title="Chat with AI assistant"
            body="Ask questions about oral hygiene, procedures, and aftercare."
            icon={MessageSquare}
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <div className="rounded-2xl border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function ActionCard({ to, title, body, icon: Icon }: { to: string; title: string; body: string; icon: any }) {
  return (
    <Link to={to} className="group rounded-2xl border bg-card p-6 transition-all hover:border-primary/50" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold group-hover:text-primary">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}
