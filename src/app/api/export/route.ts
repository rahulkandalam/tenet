import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getJournal, getTimezone } from "@/lib/tenet/queries";
import { formatWhen } from "@/lib/tenet/time";

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const [tz, rows] = await Promise.all([getTimezone(supabase), getJournal(supabase, null, 5000)]);
  const header = ["checked_at", "pair", "direction", "entry", "stop", "target", "rr", "risk", "verdict", "decision", "rules_passed", "rules_total", "failed_rules", "summary", "check_id"];
  const lines = rows.map((r) => {
    const p = r.extracted_plan ?? {};
    const failed = r.rules.filter((x) => x.status === "Failed").map((x) => x.rule_code).filter(Boolean).join(" ");
    return [formatWhen(r.created_at, tz), p.pair, p.direction, p.entry, p.stop, p.target, p.rr_ratio, p.size_or_risk, r.verdict, r.decision, r.rules.filter((x) => x.status === "Passed").length, r.rules.length, failed, r.summary, r.id]
      .map(cell)
      .join(",");
  });
  const csv = [header.join(","), ...lines].join("\n");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="tenet-journal-${date}.csv"` },
  });
}
