import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UsageKind = "evaluate" | "transcribe" | "structure";

const FIXED_LIMITS: Partial<Record<UsageKind, number>> = { structure: 20, transcribe: 100 };

/** Checks the per-day limit on the server, then records one use. Returns remaining after this use. */
export async function consumeQuota(supabase: SupabaseClient, kind: UsageKind) {
  let limit: number;
  const fixed = FIXED_LIMITS[kind];
  if (fixed !== undefined) {
    limit = fixed;
  } else {
    const { data } = await supabase.from("profiles").select("daily_limit").single();
    limit = (data?.daily_limit as number | undefined) ?? 50;
  }
  const { data: used, error } = await supabase.rpc("usage_today", { p_kind: kind });
  if (error) throw new Error(`usage_today: ${error.message}`);
  if ((used ?? 0) >= limit) return { ok: false as const, limit, used: used ?? 0 };
  const ins = await supabase.from("usage_events").insert({ kind });
  if (ins.error) throw new Error(`usage insert: ${ins.error.message}`);
  return { ok: true as const, limit, used: (used ?? 0) + 1, remaining: limit - (used ?? 0) - 1 };
}
