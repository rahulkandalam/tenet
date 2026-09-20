import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCheck } from "@/lib/tenet/queries";
import { EvalResponse, parseClosingNote, ruleTone, TONE, VERDICT_STYLE } from "@/lib/tenet/eval";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/check/status-pill";
import { VerdictChip } from "@/components/check/verdict-chip";
import { DecisionActions } from "@/components/check/decision";
import { cn } from "@/lib/utils";

export const metadata = { title: "Verdict" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

function Field({ k, v, tone }: { k: string; v: string | null | undefined; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md bg-field px-3 py-2.5 ring-1 ring-inset ring-white/[.06]">
      <span className="text-xs text-ink-muted">{k}</span>
      <span className={cn("num truncate text-[15px]", v ? tone ?? "text-ink" : "text-ink-muted")}>{v ?? "—"}</span>
    </div>
  );
}

export default async function VerdictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const data = await getCheck(supabase, id);
  if (!data) notFound();
  const parsed = EvalResponse.safeParse(data.check.result);
  if (!parsed.success || parsed.data.verdict_word === "PROMPT") redirect(`/check/${id}`);
  const r = parsed.data;
  const note = parseClosingNote(r.closing_note);
  const p = r.extracted_plan;
  const tones = r.rules.map(ruleTone);
  const met = tones.filter((t) => t === "met").length;
  const circ = 194.78;
  const title = [p.pair, p.direction?.toLowerCase()].filter(Boolean).join(" ") || "Check";
  const firstUser = data.messages.find((m) => m.role === "user");
  const s = VERDICT_STYLE[r.verdict_word];
  const ringColor = { "GO AHEAD": "#3DD68C", "PROCEED WITH CAUTION": "#F5B84B", "NO GO": "#FF6B81", PROMPT: "#6FB6FF" }[r.verdict_word];

  return (
    <>
      <PageHeader crumbs={["Check", `${title} · ${when(data.check.created_at)}`]}>
        <Button asChild size="sm" variant="secondary"><Link href={`/check/${id}`}><span className="sm:hidden">Chat</span><span className="hidden sm:inline">Open conversation</span></Link></Button>
        <Button asChild size="sm" className="hidden sm:inline-flex"><Link href="/check">New check</Link></Button>
      </PageHeader>
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 md:p-6 md:pt-5 lg:flex-row lg:gap-5">
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className={cn("flex items-center gap-4 rounded-xl px-4 py-4 ring-1 ring-inset md:gap-6 md:px-6 md:py-[22px]", s.panel)}>
            <div className="flex flex-1 flex-col gap-2.5">
              <VerdictChip verdict={r.verdict_word} />
              <p className="text-base leading-snug tracking-[-0.015em] text-[#f0f0f2] md:text-xl">{r.summary}</p>
            </div>
            {r.rules.length > 0 && (
              <div className="relative size-16 shrink-0 md:size-[88px]">
                <svg viewBox="0 0 76 76" aria-hidden className="size-full">
                  <circle cx="38" cy="38" r="31" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                  <circle cx="38" cy="38" r="31" fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round" transform="rotate(-90 38 38)" strokeDasharray={`${(met / r.rules.length) * circ} ${circ}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="num text-base font-medium md:text-xl">{met}/{r.rules.length}</span>
                  <span className="text-[10px] tracking-[0.06em] text-ink-muted">MET</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {([
              ["What's good", note.good, "text-win"],
              ["What's bad", note.bad, "text-caution"],
              ["Motivation", note.motivation, "text-brand-soft"],
            ] as const).map(([h, t, c]) =>
              t ? (
                <div key={h} className="flex flex-col gap-1.5 rounded-[14px] bg-field px-4 py-3.5 ring-1 ring-inset ring-white/[.06]">
                  <span className={cn("text-xs font-semibold", c)}>{h}</span>
                  <span className="text-sm leading-relaxed text-[#c9c9cf]">{t}</span>
                </div>
              ) : null,
            )}
            {note.other && <p className="text-sm leading-relaxed text-[#c9c9cf] md:col-span-3">{note.other}</p>}
          </div>

          <div className="onyx-card flex flex-col px-3 py-3.5">
            <div className="flex items-center justify-between px-3 pb-2 pt-1">
              <span className="text-[15px] font-semibold">Rules</span>
              <span className="text-xs text-ink-muted">Rulebook v{data.rulebookVersion} · {data.ruleCount} rules</span>
            </div>
            {r.rules.map((x, i) => (
              <div key={i} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3.5 rounded-md px-3 py-3.5", TONE[tones[i]].row)}>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{x.label}</span>
                  <span className="text-[13px] leading-relaxed text-ink-soft">{x.explanation}</span>
                </div>
                <StatusPill tone={tones[i]} />
              </div>
            ))}
          </div>
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[380px]">
          <div className="onyx-card flex flex-col gap-3 p-[18px]">
            <span className="text-xs font-semibold tracking-[0.1em] text-ink-muted">YOUR DECISION</span>
            <DecisionActions checkId={id} verdict={r.verdict_word} initial={data.decision} />
            {data.decidedAt && <span className="text-xs text-ink-muted">Last updated {when(data.decidedAt)}</span>}
          </div>
          <div className="onyx-card flex flex-col gap-3 p-[18px]">
            <span className="text-xs font-semibold tracking-[0.1em] text-ink-muted">THE PLAN</span>
            <div className="grid grid-cols-3 gap-2">
              <Field k="Pair" v={p.pair} />
              <Field k="Direction" v={p.direction ? p.direction[0] + p.direction.slice(1).toLowerCase() : null} tone={p.direction === "SHORT" ? "text-loss" : "text-win"} />
              <Field k="R:R" v={p.rr_ratio ? `${p.rr_ratio}R` : null} />
              <Field k="Entry" v={p.entry} />
              <Field k="Stop" v={p.stop} tone="text-loss" />
              <Field k="Target" v={p.target} tone="text-win" />
            </div>
            <Field k="Risk" v={p.size_or_risk} />
            {firstUser && (
              <p className="whitespace-pre-wrap rounded-md bg-field p-3 text-[13px] leading-relaxed text-ink-soft">&ldquo;{firstUser.content}&rdquo;</p>
            )}
            {data.charts.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {data.charts.map((c) => (
                  <a key={c.path} href={c.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt="Attached chart" className="h-[72px] w-full rounded-md object-cover ring-1 ring-white/10" />
                  </a>
                ))}
              </div>
            )}
          </div>
          <span className="num px-1 text-xs text-ink-muted">
            Rulebook v{data.rulebookVersion} · {data.check.model ?? "gpt-5"}
            {data.check.latency_ms ? ` · ${(data.check.latency_ms / 1000).toFixed(1)} s` : ""} · {when(data.check.created_at)} IST
          </span>
        </aside>
      </main>
    </>
  );
}
