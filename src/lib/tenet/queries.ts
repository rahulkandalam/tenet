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
