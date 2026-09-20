import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJournal, getTimezone, getUsage, type JournalRow } from "@/lib/tenet/queries";
import { zonedMidnight, formatWhen } from "@/lib/tenet/time";
import { CheckHeader } from "@/components/check/check-header";
import { VerdictChip } from "@/components/check/verdict-chip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Journal" };

const RANGES = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "7 days", days: 6 },
  { key: "30d", label: "30 days", days: 29 },
  { key: "all", label: "All", days: null },
] as const;
const FILTERS = [
  { key: "all", label: "All" },
  { key: "go", label: "Go ahead", verdict: "GO AHEAD" },
  { key: "caution", label: "Caution", verdict: "PROCEED WITH CAUTION" },
  { key: "nogo", label: "No go", verdict: "NO GO" },
  { key: "open", label: "Open questions", verdict: "PROMPT" },
] as const;
const DECISION: Record<NonNullable<JournalRow["decision"]>, { label: string; cls: string }> = {
  taken: { label: "Taken", cls: "text-ink" },
  skipped: { label: "Skipped", cls: "text-ink-soft" },
  override: { label: "Override", cls: "text-loss" },
};

function kpis(rows: JournalRow[]) {
  const done = rows.filter((r) => r.verdict !== "PROMPT");
  const decided = done.filter((r) => r.decision);
  const overrides = decided.filter((r) => r.decision === "override").length;
  const followed = decided.length - overrides;
  const misses = new Map<string, number>();
  for (const r of done) for (const x of r.rules) if (x.status === "Failed" && x.rule_code) misses.set(x.rule_code, (misses.get(x.rule_code) ?? 0) + 1);
  const top = [...misses.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true }))[0];
  return [
    { label: "Checks", value: String(rows.length), sub: `${done.length} with a verdict · ${rows.length - done.length} still open` },
    { label: "Followed the verdict", value: decided.length ? `${Math.round((followed / decided.length) * 100)}%` : "—", sub: decided.length ? `${followed} of ${decided.length} logged decisions` : "No decisions logged yet" },
    { label: "Overrides", value: String(overrides), sub: overrides === 1 ? "One NO GO taken anyway" : "NO GO verdicts taken anyway" },
    { label: "Most-missed rule", value: top?.[0] ?? "—", sub: top ? `Failed in ${top[1]} check${top[1] === 1 ? "" : "s"}` : "Nothing failed" },
  ];
}

const href = (range: string, v: string) => `/journal?range=${range}&v=${v}`;

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ range?: string; v?: string }> }) {
  const sp = await searchParams;
  const range = RANGES.find((r) => r.key === sp.range) ?? RANGES[1];
  const filter = FILTERS.find((f) => f.key === sp.v) ?? FILTERS[0];
  const supabase = await createClient();
  const [tz, usage] = await Promise.all([getTimezone(supabase), getUsage(supabase)]);
  const rows = await getJournal(supabase, range.days === null ? null : zonedMidnight(tz, range.days));
  const shown = "verdict" in filter ? rows.filter((r) => r.verdict === filter.verdict) : rows;

  return (
    <>
      <CheckHeader crumbs={["Journal"]} used={usage.used} limit={usage.limit} />
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Date range" className="flex h-[38px] rounded-[11px] border border-white/[.08] bg-field p-[3px]">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={href(r.key, filter.key)}
                aria-current={r.key === range.key ? "page" : undefined}
                className={cn("flex items-center rounded-[8px] px-4 text-[13px] transition-colors", r.key === range.key ? "bg-[#1c1c23] text-ink ring-1 ring-inset ring-white/[.08]" : "text-ink-muted hover:text-ink")}
              >
                {r.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={href(range.key, f.key)}
                aria-current={f.key === filter.key ? "true" : undefined}
                className={cn("flex h-[34px] items-center rounded-full px-3 text-[13px] ring-1 ring-inset transition-colors", f.key === filter.key ? "bg-surface-raised text-ink ring-white/[.14]" : "text-ink-soft ring-white/[.07] hover:text-ink")}
              >
                {f.label}
              </Link>
            ))}
            <Button asChild size="sm" variant="ghost" className="ml-1">
              <a href="/api/export" download><Download /> Export CSV</a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis(rows).map((k) => (
            <div key={k.label} className="onyx-card flex flex-col gap-1.5 px-[18px] py-4">
              <span className="text-xs text-ink-muted">{k.label}</span>
              <span className="num text-[26px] font-medium tracking-[-0.02em]">{k.value}</span>
              <span className="text-xs text-ink-soft">{k.sub}</span>
            </div>
          ))}
        </div>

        <div className="onyx-card flex flex-col p-2">
          <div className="grid grid-cols-[112px_92px_56px_220px_90px_64px_64px_52px_minmax(0,1fr)] gap-3 border-b border-white/5 px-3.5 py-2.5 text-xs text-ink-muted">
            <span>Checked</span><span>Pair</span><span>Side</span><span>Verdict</span><span>Decision</span>
            <span className="text-right">R:R</span><span className="text-right">Risk</span><span className="text-right">Met</span><span>Summary</span>
          </div>
          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <p className="text-sm text-ink-soft">{rows.length ? "No checks match this filter." : "No checks in this range yet."}</p>
              {!rows.length && <Button asChild size="sm"><Link href="/check">Check a trade</Link></Button>}
            </div>
          ) : (
            shown.map((r) => {
              const p = r.extracted_plan ?? {};
              const dir = (p.direction ?? "").toUpperCase();
              const passed = r.rules.filter((x) => x.status === "Passed").length;
              const open = r.verdict === "PROMPT";
              return (
                <Link
                  key={r.id}
                  href={open ? `/check/${r.id}` : `/check/${r.id}/verdict`}
                  className="grid grid-cols-[112px_92px_56px_220px_90px_64px_64px_52px_minmax(0,1fr)] items-center gap-3 rounded-md px-3.5 py-[11px] transition-colors hover:bg-[#121217]"
                >
                  <span className="num text-[13px] text-ink-soft">{formatWhen(r.created_at, tz)}</span>
                  <span className="num truncate text-[13px]">{p.pair ?? "—"}</span>
                  <span className={cn("text-[13px]", dir === "SHORT" ? "text-loss" : dir === "LONG" ? "text-win" : "text-ink-muted")}>{dir ? dir[0] + dir.slice(1).toLowerCase() : "—"}</span>
                  <span className="min-w-0">{r.verdict && <VerdictChip verdict={r.verdict} className="py-1 text-[11px] tracking-[0.06em]" />}</span>
                  <span className={cn("text-[13px]", open ? "text-prompt" : r.decision ? DECISION[r.decision].cls : "text-ink-muted")}>
                    {open ? "Unfinished" : r.decision ? DECISION[r.decision].label : "Not logged"}
                  </span>
                  <span className="num text-right text-[13px]">{p.rr_ratio ? `${p.rr_ratio}R` : "—"}</span>
                  <span className="num text-right text-[13px] text-ink-soft">{p.size_or_risk ?? "—"}</span>
                  <span className="num text-right text-[13px] text-ink-soft">{r.rules.length ? `${passed}/${r.rules.length}` : "—"}</span>
                  <span className="truncate text-[13px] text-ink-soft">{r.summary}</span>
                </Link>
              );
            })
          )}
        </div>
        <p className="text-xs text-ink-muted">Every check is saved automatically. Trade outcomes and performance in R arrive in the next release.</p>
      </main>
    </>
  );
}
