import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquareHeart, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendChatMessage } from "@/lib/ai-chat.functions";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

interface Msg { id: string; role: string; content: string; created_at: string; }

function ChatPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const send = useServerFn(sendChatMessage);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (role && role !== "patient") navigate({ to: "/dashboard" });
  }, [role, navigate]);

  const { data: messages } = useQuery({
    queryKey: ["chat", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Msg[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    setPending(true);
    try {
      await send({ data: { message: text } });
      await qc.invalidateQueries({ queryKey: ["chat"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send");
    } finally { setPending(false); }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
          <MessageSquareHeart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI assistant</h1>
          <p className="text-sm text-muted-foreground">Ask about oral hygiene, procedures, or aftercare.</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-2xl border bg-card p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        {(!messages || messages.length === 0) && (
          <div className="grid h-full place-items-center text-center text-muted-foreground">
            <div>
              <Sparkles className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 text-sm">Start by asking a question — for example,<br />"How often should I floss?"</p>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages?.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">Thinking…</div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={onSend} className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the dental assistant…"
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        AI responses are for general guidance only — consult your dentist for medical advice.
      </p>
    </div>
  );
}
