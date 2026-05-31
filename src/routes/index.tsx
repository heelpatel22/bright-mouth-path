import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, FileText, MessageSquareHeart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brightsmile Dental Portal — Patient & Staff Sign In" },
      { name: "description", content: "Secure portal for dental patients to view reports, read tips, and chat with our AI assistant." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </span>
            Brightsmile
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Create account</Button></Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)", opacity: 0.08 }} />
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            HIPAA-aware patient portal
          </span>
          <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight md:text-6xl">
            Your dental care, <span className="text-primary">connected</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
            Access your reports, follow personalized health tips from your dental team,
            and chat with our AI assistant — anytime, anywhere.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="lg">Patient sign in</Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">Staff sign in</Button></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: FileText, title: "Dental reports", body: "View, download, and track every report your clinic uploads to your secure record." },
            { icon: MessageSquareHeart, title: "AI assistant", body: "Friendly answers to your oral-health questions, available 24/7 between appointments." },
            { icon: ShieldCheck, title: "Health tips", body: "Personalized guidance from our doctors and nurses to keep your smile bright." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Brightsmile Dental Clinic
        </div>
      </footer>
    </div>
  );
}
