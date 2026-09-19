import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chatJSON } from "@/lib/openai";
import { consumeQuota } from "@/lib/usage";
import { STRUCTURE_PROMPT } from "@/lib/tenet/structure-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const Output = z.object({
  rules: z
    .array(
      z.object({
        section: z.enum(["qualifying", "entry", "exit", "risk", "soft"]),
        kind: z.enum(["hard", "soft"]).catch("hard"),
        body: z.string().min(1).max(1000),
        note: z.string().nullish(),
      }),
    )
    .max(80),
  ignored: z.array(z.object({ text: z.string(), reason: z.string().nullish() })).catch([]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "The document is empty." }, { status: 400 });

  const quota = await consumeQuota(supabase, "structure");
  if (!quota.ok) return NextResponse.json({ error: `You have used today's ${quota.limit} rulebook imports.` }, { status: 429 });

  const res = await chatJSON<unknown>({
    system: STRUCTURE_PROMPT,
    user: `<RULEBOOK_TEXT>\n${text.slice(0, 60_000)}\n</RULEBOOK_TEXT>`,
    maxTokens: 8000,
  });
  if (!res.ok) return NextResponse.json({ error: res.message }, { status: 502 });

  const parsed = Output.safeParse(res.data);
  if (!parsed.success) {
    console.error("[structure] schema", parsed.error.issues.slice(0, 3));
    return NextResponse.json({ error: "The rules came back in an unexpected shape. Please try again." }, { status: 502 });
  }
  const rules = parsed.data.rules.map((r) => ({ ...r, kind: r.section === "soft" ? "soft" : r.kind, note: r.note || null }));
  return NextResponse.json({ rules, ignored: parsed.data.ignored });
}
