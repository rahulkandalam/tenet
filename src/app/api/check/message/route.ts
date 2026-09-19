import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chatJSON } from "@/lib/openai";
import { consumeQuota } from "@/lib/usage";
import { SYSTEM_PROMPT } from "@/lib/tenet/prompt";
import { toPromptRulebook, type SavedRule } from "@/lib/tenet/rulebook";
import { EvalResponse } from "@/lib/tenet/eval";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  checkId: z.string().uuid().nullish(),
  text: z.string().trim().min(1).max(8000),
  attachments: z.array(z.object({ path: z.string().min(3).max(300), mime: z.enum(["image/png", "image/jpeg", "image/webp"]) })).max(3).default([]),
});

const MAX_CHARTS = 3;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That message could not be sent." }, { status: 400 });
  const { text, attachments } = parsed.data;
  let checkId = parsed.data.checkId ?? null;

  if (attachments.some((a) => !a.path.startsWith(`${user.id}/`))) {
    return NextResponse.json({ error: "Invalid attachment." }, { status: 400 });
  }

  // Rulebook: a continuing check keeps the version it started with.
  let rulebookId: string;
  if (checkId) {
    const { data: chk } = await supabase.from("checks").select("id, rulebook_id").eq("id", checkId).maybeSingle();
    if (!chk) return NextResponse.json({ error: "Check not found." }, { status: 404 });
    rulebookId = chk.rulebook_id;
  } else {
    const { data: rb } = await supabase.from("rulebooks").select("id").eq("is_active", true).maybeSingle();
    if (!rb) return NextResponse.json({ error: "Save a rulebook first." }, { status: 409 });
    rulebookId = rb.id;
  }

  const quota = await consumeQuota(supabase, "evaluate");
  if (!quota.ok) {
    return NextResponse.json({ error: `You have used all ${quota.limit} checks for today. The count resets at midnight.` }, { status: 429 });
  }

  if (!checkId) {
    const { data: created, error } = await supabase.from("checks").insert({ rulebook_id: rulebookId }).select("id").single();
    if (error || !created) return NextResponse.json({ error: "Could not start the check." }, { status: 500 });
    checkId = created.id as string;
  }

  if (attachments.length) {
    const { count } = await supabase.from("attachments").select("id", { count: "exact", head: true }).eq("check_id", checkId);
    if ((count ?? 0) + attachments.length > MAX_CHARTS) {
      return NextResponse.json({ error: `Up to ${MAX_CHARTS} charts per check.`, checkId }, { status: 400 });
    }
    await supabase.from("attachments").insert(attachments.map((a) => ({ check_id: checkId, storage_path: a.path, mime_type: a.mime })));
  }

  const [{ data: rules }, { data: history }, { data: charts }] = await Promise.all([
    supabase.from("rules").select("code, section, kind, body, position").eq("rulebook_id", rulebookId).order("position"),
    supabase.from("check_messages").select("role, content").eq("check_id", checkId).order("created_at"),
    supabase.from("attachments").select("storage_path").eq("check_id", checkId).order("created_at"),
  ]);

  await supabase.from("check_messages").insert({ check_id: checkId, role: "user", content: text });

  // Same user-message layout as v1 so the prompt behaves identically.
  const historyText = (history ?? [])
    .map((m) => `  ${m.role === "user" ? "Trader" : "Tenet"}: "${m.content.replace(/"/g, '\\"')}"`)
    .join("\n");
  const rulebookBlock = `RULEBOOK (structured):\n${JSON.stringify(toPromptRulebook((rules ?? []) as SavedRule[]), null, 2)}\n`;
  const userText = `<RULEBOOK>\n${rulebookBlock}\n</RULEBOOK>\n\n<CONVERSATION_HISTORY>\n${historyText}\n</CONVERSATION_HISTORY>\n\n<LATEST_INPUT>\n${text}\n</LATEST_INPUT>`;

  // All charts in the check are re-sent every turn (the API is stateless).
  let images: string[] = [];
  if (charts?.length) {
    const { data: signed } = await supabase.storage.from("charts").createSignedUrls(charts.map((c) => c.storage_path), 600);
    images = (signed ?? []).map((s) => s.signedUrl).filter(Boolean) as string[];
  }

  const res = await chatJSON<unknown>({ system: SYSTEM_PROMPT, user: userText, images, timeoutMs: 110_000 });
  if (!res.ok) return NextResponse.json({ error: res.message, checkId }, { status: 502 });

  const ev = EvalResponse.safeParse(res.data);
  if (!ev.success) {
    console.error("[check] schema", ev.error.issues.slice(0, 3));
    return NextResponse.json({ error: "Tenet's answer came back in an unexpected shape. Please try again.", checkId }, { status: 502 });
  }
  const r = ev.data;
  const isPrompt = r.verdict_word === "PROMPT";
  const reply = isPrompt ? r.follow_up_question || r.summary : r.summary;

  await supabase.from("check_messages").insert({ check_id: checkId, role: "assistant", content: reply });
  await supabase
    .from("checks")
    .update({
      status: isPrompt ? "open" : "complete",
      verdict: r.verdict_word,
      summary: r.summary,
      closing_note: r.closing_note,
      extracted_plan: r.extracted_plan,
      result: r,
      model: res.model,
      latency_ms: res.latencyMs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkId);

  if (!isPrompt) {
    await supabase.from("rule_results").delete().eq("check_id", checkId);
    if (r.rules.length) {
      await supabase.from("rule_results").insert(
        r.rules.map((x, i) => ({
          check_id: checkId,
          position: i + 1,
          rule_code: x.label.match(/\bR\d+\b/)?.[0] ?? null,
          label: x.label,
          status: x.status,
          explanation: x.explanation,
        })),
      );
    }
  }

  return NextResponse.json({ checkId, reply, result: r, remaining: quota.remaining });
}
