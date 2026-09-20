"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, CircleHelp, ImagePlus, Loader2, Mic, RotateCcw, Square, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/check/status-pill";
import { VerdictChip } from "@/components/check/verdict-chip";
import { DecisionActions, type DecisionValue } from "@/components/check/decision";
import { planChecklist, ruleTone, VERDICT_STYLE, type EvalResponse } from "@/lib/tenet/eval";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; charts?: string[] };
type Chart = { path: string; url: string; mime: string };
type Pending = { file: File; url: string };

export type CheckViewProps = {
  userId: string;
  checkId: string | null;
  rulebookVersion: number;
  ruleCount: number;
  initialMessages: Msg[];
  initialResult: EvalResponse | null;
  initialCharts: Chart[];
  initialDecision: DecisionValue | null;
  usage: { used: number; limit: number };
};

const MAX_CHARTS = 3;
const ACCEPT = ["image/png", "image/jpeg", "image/webp"];

export function CheckView(props: CheckViewProps) {
  const [checkId, setCheckId] = useState(props.checkId);
  const [messages, setMessages] = useState<Msg[]>(props.initialMessages);
  const [result, setResult] = useState<EvalResponse | null>(props.initialResult);
  const [charts, setCharts] = useState<Chart[]>(props.initialCharts);
  const [pending, setPending] = useState<Pending[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<{ text: string; retry?: { text: string; files: Pending[] } } | null>(null);
  const [used, setUsed] = useState(props.usage.used);
  const [recording, setRecording] = useState<"idle" | "rec" | "transcribing">("idle");
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);

  const complete = !!result && result.verdict_word !== "PROMPT";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, error]);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [draft]);

  function addFiles(list: FileList | File[]) {
    setError(null);
    const room = MAX_CHARTS - charts.length - pending.length;
    const files = Array.from(list).filter((f) => ACCEPT.includes(f.type));
    if (!files.length) return setError({ text: "Charts must be PNG, JPG or WebP images." });
    if (files.some((f) => f.size > 5 * 1024 * 1024)) return setError({ text: "Each chart must be under 5 MB." });
    if (room <= 0) return setError({ text: `Up to ${MAX_CHARTS} charts per check.` });
    setPending((p) => [...p, ...files.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  async function send(text: string, files: Pending[]) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setElapsed(0);
    setError(null);
    setDraft("");
    setPending([]);
    setMessages((m) => [...m, { role: "user", content: text.trim(), charts: files.map((f) => f.url) }]);

    try {
      const supabase = createClient();
      const uploaded: { path: string; mime: string; url: string }[] = [];
      for (const f of files) {
        const ext = f.file.type === "image/png" ? "png" : f.file.type === "image/webp" ? "webp" : "jpg";
        const path = `${props.userId}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("charts").upload(path, f.file, { contentType: f.file.type });
        if (up.error) throw new Error("Could not upload the chart. Please try again.");
        uploaded.push({ path, mime: f.file.type, url: f.url });
      }

      const res = await fetch("/api/check/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId, text: text.trim(), attachments: uploaded.map(({ path, mime }) => ({ path, mime })) }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.checkId && j.checkId !== checkId) {
        setCheckId(j.checkId);
        window.history.replaceState(null, "", `/check/${j.checkId}`);
      }
      if (!res.ok) throw new Error(j.error ?? "Something went wrong.");
      setCharts((c) => [...c, ...uploaded]);
      setResult(j.result);
      setMessages((m) => [...m, { role: "assistant", content: j.reply }]);
      setUsed((u) => u + 1);
    } catch (e) {
      // Keep the trader's words: remove the optimistic bubble and put the text back.
      setMessages((m) => m.slice(0, -1));
      setDraft(text);
      setPending(files);
      setError({ text: e instanceof Error ? e.message : "Something went wrong.", retry: { text, files } });
    } finally {
      setBusy(false);
    }
  }

  async function toggleMic() {
    if (recording === "rec") {
      recRef.current?.stop();
      return;
    }
    if (recording === "transcribing") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording("transcribing");
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const fd = new FormData();
        fd.append("audio", new File([blob], "recording", { type: blob.type }));
        const res = await fetch("/api/transcribe", { method: "POST", body: fd }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        setRecording("idle");
        if (!res?.ok) return setError({ text: j.error ?? "Could not transcribe that. Please type it instead." });
        setDraft((d) => (d.trim() ? d.trimEnd() + " " : "") + (j.text ?? "").trim());
        taRef.current?.focus();
      };
      recRef.current = rec;
      rec.start();
      setRecording("rec");
    } catch {
      setError({ text: "Microphone access was blocked. Allow it in your browser, or type instead." });
    }
  }

  const checklist = planChecklist(result?.extracted_plan, charts.length);
  const missing = checklist.filter((c) => !c.optional && !c.value).length;

  return (
    <main className="flex min-h-0 flex-1 gap-5 md:p-6 md:pt-5">
      {/* ───────── Chat ───────── */}
      <section
        className="onyx-card flex min-w-0 flex-1 flex-col overflow-hidden max-md:rounded-none max-md:shadow-none"
        onDragOver={(e) => { if (!complete) e.preventDefault(); }}
        onDrop={(e) => { if (complete) return; e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-4 pb-2.5 pt-3 md:px-5 md:pb-3 md:pt-[18px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold tracking-[-0.02em] md:text-lg">Talk it through</span>
            <span className="text-[13px] text-ink-muted">Checked against Rulebook v{props.rulebookVersion} only · {props.ruleCount} rules</span>
          </div>
        </div>

        <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-4 md:px-7 md:py-5">
          {messages.length === 0 && (
            <div className="m-auto flex max-w-[520px] flex-col items-center gap-3 text-center">
              <span className="text-xs font-semibold tracking-[0.1em] text-brand-soft">NEW CHECK</span>
              <p className="text-xl font-medium tracking-[-0.02em]">Describe the trade the way you would say it.</p>
              <p className="text-sm leading-relaxed text-ink-soft">
                Pair, direction, why you want it, where you get in and out, and how much you are risking. Attach up to three charts.
                Tenet asks for anything your rules need before it gives a verdict.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[88%] whitespace-pre-wrap px-4 py-3 md:max-w-[620px] text-sm leading-relaxed text-[#e4e4e8] ring-1 ring-inset",
                  m.role === "user" ? "rounded-[14px_14px_4px_14px] bg-brand/[.12] ring-brand/25" : "rounded-[14px_14px_14px_4px] bg-[#121217] ring-white/[.06]",
                )}
              >
                {m.role === "assistant" && <span className="mb-1 block text-[11px] font-semibold tracking-[0.08em] text-brand-soft">TENET</span>}
                {m.content}
              </div>
              {!!m.charts?.length && (
                <div className="flex gap-2">
                  {m.charts.map((u) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={u} src={u} alt="Attached chart" className="h-16 w-24 rounded-[10px] object-cover ring-1 ring-white/10" />
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2.5 self-start rounded-[14px_14px_14px_4px] bg-[#121217] px-4 py-3 text-sm text-ink-soft ring-1 ring-inset ring-white/[.06]">
              <Loader2 className="size-4 animate-spin text-brand-soft" />
              Checking your rules… <span className="num text-ink-muted">{elapsed}s</span>
            </div>
          )}
          {error && (
            <div role="alert" className="flex items-center gap-3 self-start rounded-[12px] bg-nogo/[.08] px-4 py-2.5 text-[13px] text-[#ffd0d7] ring-1 ring-inset ring-nogo/25">
              {error.text}
              {error.retry && (
                <button onClick={() => send(error.retry!.text, error.retry!.files)} className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-ink hover:underline">
                  <RotateCcw className="size-3.5" /> Retry
                </button>
              )}
            </div>
          )}
          {complete && result && !busy && (
            <div className="flex flex-col gap-3 rounded-lg bg-[#0a0a0d] p-3 ring-1 ring-inset ring-white/[.06] lg:hidden">
              <div className={cn("flex flex-col gap-2 rounded-md px-3.5 py-3 ring-1 ring-inset", VERDICT_STYLE[result.verdict_word].panel)}>
                <VerdictChip verdict={result.verdict_word} />
                <p className="text-sm leading-snug text-[#e4e4e8]">{result.summary}</p>
              </div>
              <div className="flex flex-col">
                {result.rules.map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 border-b border-white/[.04] px-1 py-2 last:border-0">
                    <span className="min-w-0 flex-1 text-[13px] leading-snug">{r.label}</span>
                    <StatusPill tone={ruleTone(r)} />
                  </div>
                ))}
              </div>
              {checkId && <DecisionActions checkId={checkId} verdict={result.verdict_word} initial={props.initialDecision} stacked />}
              {checkId && (
                <Link href={`/check/${checkId}/verdict`} className="inline-flex items-center gap-1.5 self-start text-[13px] text-brand-soft">
                  Full verdict and notes <ArrowUpRight className="size-3.5" />
                </Link>
              )}
            </div>
          )}
          {complete && !busy && (
            <div className="flex items-center gap-2 self-center pt-2 text-[13px] text-ink-muted">
              This check is complete.
              <Link href="/check" className="inline-flex items-center gap-1 text-brand-soft hover:text-ink">Start a new one <ArrowRight className="size-3.5" /></Link>
            </div>
          )}
        </div>

        {!complete && (
          <div className="flex flex-col gap-2 border-t border-white/5 px-3 pb-3 pt-2.5 md:px-3.5 md:pb-3.5 md:pt-3">
            {result && (
              <div aria-label="Plan details" className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 lg:hidden">
                {checklist.map((c) => (
                  <span
                    key={c.key}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset",
                      c.value ? "text-ink-soft ring-white/10" : c.optional ? "text-ink-muted ring-white/[.06]" : "bg-prompt/[.08] text-prompt ring-prompt/30",
                    )}
                  >
                    {c.value ? <Check className="size-3 text-go" strokeWidth={2.6} /> : <CircleHelp className="size-3" />}
                    {c.label}
                  </span>
                ))}
              </div>
            )}
            {pending.length > 0 && (
              <div className="flex gap-2 px-1">
                {pending.map((p, i) => (
                  <div key={p.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Chart ${i + 1}`} className="h-14 w-20 rounded-[10px] object-cover ring-1 ring-white/10" />
                    <button aria-label="Remove chart" onClick={() => setPending((ps) => ps.filter((x) => x !== p))} className="absolute -right-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-surface-raised text-ink ring-1 ring-white/15">
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <Button variant="secondary" size="icon" aria-label="Attach a chart screenshot" disabled={busy || charts.length + pending.length >= MAX_CHARTS} onClick={() => fileRef.current?.click()}>
                <ImagePlus />
              </Button>
              <input ref={fileRef} type="file" accept={ACCEPT.join(",")} multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
              <textarea
                ref={taRef}
                rows={1}
                aria-label={messages.length ? "Your answer" : "Describe the trade"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft, pending); } }}
                onPaste={(e) => { const imgs = Array.from(e.clipboardData.files).filter((f) => ACCEPT.includes(f.type)); if (imgs.length) { e.preventDefault(); addFiles(imgs); } }}
                placeholder={messages.length ? "Answer, or add more detail…" : "EURUSD short from the 4H order block at 1.0875–1.0890, daily bias bearish…"}
                disabled={busy}
                className="onyx-field max-h-40 min-h-11 flex-1 resize-none px-3.5 py-[11px] text-sm leading-snug text-ink placeholder:text-ink-muted"
              />
              <Button
                variant="secondary"
                size="icon"
                aria-label={recording === "rec" ? "Stop recording" : "Dictate"}
                disabled={busy || recording === "transcribing"}
                onClick={toggleMic}
                className={cn(recording === "rec" && "border-brand/45 bg-brand/[.14]")}
              >
                {recording === "rec" ? <Square className="text-brand-soft" /> : recording === "transcribing" ? <Loader2 className="animate-spin" /> : <Mic />}
              </Button>
              <Button size="icon" aria-label="Send" disabled={busy || !draft.trim()} onClick={() => send(draft, pending)}>
                <ArrowRight />
              </Button>
            </div>
            <div className="hidden justify-between px-1 text-xs text-ink-muted sm:flex">
              <span>Enter to send · Shift+Enter for a new line · paste or drop charts</span>
              <span className="num">{used} / {props.usage.limit} today</span>
            </div>
          </div>
        )}
      </section>

      {/* ───────── Panel ───────── */}
      <aside className="onyx-card hidden w-[360px] shrink-0 flex-col overflow-y-auto lg:flex">
        {busy ? (
          <div className="m-3.5 flex flex-col gap-3 rounded-lg bg-brand/[.05] p-5 ring-1 ring-inset ring-brand/20">
            <span className="text-xs font-semibold tracking-[0.1em] text-brand-soft">EVALUATING</span>
            <span className="text-lg font-medium tracking-[-0.02em]">Checking {props.ruleCount} rules</span>
            <div className="h-1 overflow-hidden rounded bg-white/[.06]">
              <div className="h-full rounded bg-brand transition-[width] duration-1000 ease-out" style={{ width: `${Math.min(90, 90 * (1 - Math.exp(-elapsed / 12)))}%` }} />
            </div>
          </div>
        ) : complete && result ? (
          <div className="flex flex-1 flex-col">
            <div className={cn("m-3.5 mb-0 flex flex-col gap-2 rounded-lg px-[18px] py-4 ring-1 ring-inset", VERDICT_STYLE[result.verdict_word].panel)}>
              <VerdictChip verdict={result.verdict_word} />
              <p className="text-sm leading-snug text-[#e4e4e8]">{result.summary}</p>
            </div>
            <div className="flex flex-col px-3.5 pt-1.5">
              {result.rules.map((r, i) => {
                const tone = ruleTone(r);
                return (
                  <div key={i} className="flex items-center gap-2.5 border-b border-white/[.04] px-1 py-2.5 last:border-0">
                    <span className="min-w-0 flex-1 text-[13px] font-medium leading-snug">{r.label}</span>
                    <StatusPill tone={tone} />
                  </div>
                );
              })}
            </div>
            <div className="mt-auto flex flex-col gap-3 p-3.5">
              {checkId && <DecisionActions checkId={checkId} verdict={result.verdict_word} initial={props.initialDecision} stacked />}
              {checkId && (
                <Link href={`/check/${checkId}/verdict`} className="inline-flex items-center gap-1.5 self-start text-[13px] text-brand-soft hover:text-ink">
                  Full verdict and notes <ArrowUpRight className="size-3.5" />
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-3.5">
            <div className="flex flex-col gap-1.5 rounded-lg bg-prompt/[.05] px-[18px] py-4 ring-1 ring-inset ring-prompt/20">
              <span className="text-xs font-semibold tracking-[0.1em] text-prompt">BEFORE THE CHECK</span>
              <span className="text-[17px] font-medium tracking-[-0.02em]">
                {!result ? "Waiting for your plan" : missing ? `Tenet needs ${missing} more detail${missing > 1 ? "s" : ""}` : "Answer Tenet's question"}
              </span>
              <span className="text-[13px] leading-snug text-ink-soft">Missing details are asked for in the chat, never assumed.</span>
            </div>
            <div className="flex flex-col">
              {checklist.map((c) => (
                <div key={c.key} className={cn("flex items-center gap-3 rounded-md px-3 py-2.5", !c.value && !c.optional && result && "bg-prompt/[.04]")}>
                  <span className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-full", c.value ? "bg-go/[.14] text-go" : "bg-prompt/[.12] text-prompt")}>
                    {c.value ? <Check className="size-3" strokeWidth={2.6} /> : <CircleHelp className="size-3" strokeWidth={2.2} />}
                  </span>
                  <span className="flex-1 text-sm font-medium">{c.label}</span>
                  <span className={cn("num max-w-[120px] truncate text-[13px]", c.value ? "text-[#e4e4e8]" : c.optional ? "text-ink-muted" : "text-prompt")}>
                    {c.value ?? (c.optional ? "Optional" : result ? "Missing" : "—")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
