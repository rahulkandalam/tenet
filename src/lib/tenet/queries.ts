import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SavedRule } from "@/lib/tenet/rulebook";

export type ActiveRulebook = {
  id: string;
  version: number;
  source: "upload" | "manual";
  source_filename: string | null;
  raw_text: string | null;
  created_at: string;
  rules: SavedRule[];
};

export async function getActiveRulebook(supabase: SupabaseClient): Promise<ActiveRulebook | null> {
  const { data } = await supabase
    .from("rulebooks")
    .select("id, version, source, source_filename, raw_text, created_at, rules(code, section, kind, body, position)")
    .eq("is_active", true)
    .order("position", { referencedTable: "rules" })
    .maybeSingle();
  return (data as ActiveRulebook | null) ?? null;
}

export async function getVersions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("rulebooks")
    .select("id, version, source, source_filename, is_active, created_at, checks(count)")
    .order("version", { ascending: false });
  return (data ?? []).map((v) => ({
    ...v,
    checkCount: (v.checks as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

export async function nextVersion(supabase: SupabaseClient) {
  const { data } = await supabase.from("rulebooks").select("version").order("version", { ascending: false }).limit(1);
  return (data?.[0]?.version ?? 0) + 1;
}

export async function getUsage(supabase: SupabaseClient) {
  const [{ data: used }, { data: profile }] = await Promise.all([
    supabase.rpc("usage_today", { p_kind: "evaluate" }),
    supabase.from("profiles").select("daily_limit").maybeSingle(),
  ]);
  return { used: (used as number | null) ?? 0, limit: (profile?.daily_limit as number | undefined) ?? 50 };
}

export async function getCheck(supabase: SupabaseClient, id: string) {
  const { data: check } = await supabase
    .from("checks")
    .select("id, status, verdict, summary, closing_note, extracted_plan, result, model, latency_ms, created_at, rulebook_id, rulebooks(version, rules(count))")
    .eq("id", id)
    .maybeSingle();
  if (!check) return null;
  const [{ data: messages }, { data: attachments }, { data: decision }] = await Promise.all([
    supabase.from("check_messages").select("role, content, created_at").eq("check_id", id).order("created_at"),
    supabase.from("attachments").select("storage_path, mime_type").eq("check_id", id).order("created_at"),
    supabase.from("decisions").select("decision, decided_at").eq("check_id", id).maybeSingle(),
  ]);
  let charts: { path: string; url: string; mime: string }[] = [];
  if (attachments?.length) {
    const { data: signed } = await supabase.storage.from("charts").createSignedUrls(attachments.map((a) => a.storage_path), 3600);
    charts = attachments.map((a, i) => ({ path: a.storage_path, mime: a.mime_type, url: signed?.[i]?.signedUrl ?? "" }));
  }
  const rb = check.rulebooks as unknown as { version: number; rules: { count: number }[] } | null;
  return {
    check,
    messages: (messages ?? []) as { role: "user" | "assistant"; content: string; created_at: string }[],
    charts,
    decision: (decision?.decision as "taken" | "skipped" | "override" | undefined) ?? null,
    decidedAt: (decision?.decided_at as string | undefined) ?? null,
    rulebookVersion: rb?.version ?? 0,
    ruleCount: rb?.rules?.[0]?.count ?? 0,
  };
}
