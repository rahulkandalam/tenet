"use client";

import { useRef, useState } from "react";
import { FileText, ListChecks, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RulebookEditor } from "@/components/rulebook/rulebook-editor";
import { SECTIONS, defaultKind, newKey, type DraftRule, type Section } from "@/lib/tenet/rulebook";
import { cn } from "@/lib/utils";

type Stage =
  | { name: "choose" }
  | { name: "reading"; filename: string; step: "extract" | "structure" }
  | { name: "edit"; source: "upload" | "manual"; rules: DraftRule[]; filename?: string; rawText?: string; ignored?: { text: string; reason?: string | null }[] };

const BLANK: DraftRule[] = SECTIONS.filter((s) => s.required).map((s) => ({ key: newKey(), section: s.key, kind: defaultKind(s.key), body: "" }));

export function NewRulebook({ nextVersion }: { nextVersion: number }) {
  const [stage, setStage] = useState<Stage>({ name: "choose" });
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > 1024 * 1024) return setError("That file is over 1 MB.");
    setStage({ name: "reading", filename: file.name, step: "extract" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const ex = await fetch("/api/rulebook/extract", { method: "POST", body: fd });
      const exj = await ex.json();
      if (!ex.ok) throw new Error(exj.error ?? "Could not read that file.");

      setStage({ name: "reading", filename: file.name, step: "structure" });
      const st = await fetch("/api/rulebook/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: exj.text }),
      });
      const stj = await st.json();
      if (!st.ok) throw new Error(stj.error ?? "Could not sort the rules.");
      if (!stj.rules?.length) throw new Error("No trading rules found in that document. Try building it section by section.");

      setStage({
        name: "edit",
        source: "upload",
        filename: exj.filename,
        rawText: exj.text,
        ignored: stj.ignored ?? [],
        rules: stj.rules.map((r: { section: Section; kind: "hard" | "soft"; body: string; note: string | null }) => ({ ...r, key: newKey() })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage({ name: "choose" });
    }
  }

  if (stage.name === "edit") {
    return (
      <RulebookEditor
        initialRules={stage.rules}
        source={stage.source}
        filename={stage.filename}
        rawText={stage.rawText}
        ignored={stage.ignored}
        nextVersion={nextVersion}
        onStartOver={() => setStage({ name: "choose" })}
      />
    );
  }

  const reading = stage.name === "reading";
  return (
    <main className="flex flex-1 flex-col gap-7 overflow-y-auto px-10 py-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-[-0.035em]">Bring your rulebook</h1>
        <p className="max-w-[680px] text-[15px] leading-normal text-ink-soft">
          Tenet checks trades against these rules and nothing else. Each rule gets a number, and every verdict cites those numbers.
          Saving creates a new version; past checks keep the version they ran against.
        </p>
      </div>
      {error && <p role="alert" className="text-sm text-loss">{error}</p>}
      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="onyx-card flex flex-col gap-4 p-6">
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-raised"><Upload className="size-5" strokeWidth={1.6} /></span>
            <div className="flex flex-col gap-1">
              <span className="text-lg font-semibold tracking-[-0.02em]">Upload a document</span>
              <span className="text-sm leading-snug text-ink-soft">We split it into numbered rules for you to confirm. Your original text is kept.</span>
            </div>
          </div>
          {reading ? (
            <div className="flex min-h-[190px] flex-1 flex-col gap-3.5 rounded-lg bg-field p-[18px] ring-1 ring-inset ring-white/[.06]">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-[10px] bg-surface-raised text-ink-soft"><FileText className="size-5" strokeWidth={1.6} /></span>
                <span className="flex-1 truncate text-sm">{stage.filename}</span>
                <Loader2 className="size-4 animate-spin text-ink-soft" />
              </div>
              <p className="text-[13px] text-ink-soft">{stage.step === "extract" ? "Reading the file…" : "Finding and numbering your rules. This takes up to a minute."}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className={cn(
                "flex min-h-[190px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-field text-sm text-ink-soft transition-colors",
                dragging ? "border-brand/60 bg-brand/[.04]" : "border-white/15",
              )}
            >
              <span className="font-medium text-ink">Drop a file or click to choose</span>
              <span className="num text-xs text-ink-muted">.txt  .md  .docx  .pdf · up to 1 MB</span>
            </button>
          )}
          <input ref={input} type="file" accept=".txt,.md,.docx,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        </div>
        <div className="onyx-card flex flex-col gap-4 p-6">
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-raised"><ListChecks className="size-5" strokeWidth={1.6} /></span>
            <div className="flex flex-col gap-1">
              <span className="text-lg font-semibold tracking-[-0.02em]">Build it section by section</span>
              <span className="text-sm leading-snug text-ink-soft">Write rules straight into five sections. The first three are required.</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {SECTIONS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2.5 rounded-[10px] bg-field px-3 py-2.5 ring-1 ring-inset ring-white/[.06]">
                <span className="num w-4 text-xs text-ink-muted">{i + 1}</span>
                <span className="flex-1 text-sm">{s.label}</span>
                <span className={cn("text-xs", s.required ? "text-ink-soft" : "text-ink-muted")}>{s.required ? "Required" : "Optional"}</span>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-auto self-start" disabled={reading} onClick={() => setStage({ name: "edit", source: "manual", rules: BLANK.map((r) => ({ ...r, key: newKey() })) })}>
            Start building
          </Button>
        </div>
      </div>
    </main>
  );
}
