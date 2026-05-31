import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM_PROMPT = `You are Brightsmile Assistant, a friendly AI assistant for a dental clinic patient portal.
Provide helpful, accurate, and concise dental health information.
You can answer questions about oral hygiene, common dental issues, post-procedure care, and general wellness tips.
Always remind users that for diagnoses, emergencies, or specific medical advice, they should consult their dentist directly.
Be warm, professional, and reassuring. Keep responses focused and under 200 words unless the user asks for more detail.`;

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string }) =>
    z.object({ message: z.string().trim().min(1).max(2000) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load recent history (last 20)
    const { data: history } = await supabase
      .from("ai_chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Persist user message
    await supabase.from("ai_chat_messages").insert({
      user_id: userId, role: "user", content: data.message,
    });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI gateway error:", res.status, text);
      throw new Error(res.status === 429 ? "Too many requests, please slow down." :
        res.status === 402 ? "AI credits exhausted. Please contact support." :
        "AI assistant is unavailable right now.");
    }

    const payload = await res.json();
    const reply: string = payload?.choices?.[0]?.message?.content ?? "I'm not sure how to answer that.";

    await supabase.from("ai_chat_messages").insert({
      user_id: userId, role: "assistant", content: reply,
    });

    return { reply };
  });
