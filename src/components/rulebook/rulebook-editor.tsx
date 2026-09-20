"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CircleHelp, FileText, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SECTIONS,
  defaultKind,
  missingRequired,
  newKey,
  orderRules,
  type DraftRule,
  type Kind,
  type Section,
} from "@/lib/tenet/rulebook";

export type EditorProps = {
  initialRules: DraftRule[];
  source: "upload" | "manual";
  filename?: string | null;
  rawText?: string | null;
  ignored?: { text: string; reason?: string | null }[];
  nextVersion: number;
  onStartOver?: () => void;
};

export function RulebookEditor({ initialRules, source, filename, rawText, ignored = [], nextVersion, onStartOver }: EditorProps) {
  const router = useRouter();
  const [rules, setRules] = useState<DraftRule[]>(() => orderRules(initialRules));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => orderRules(rules), [rules]);
  const codeOf = (key: string) => `R${ordered.findIndex((r) => r.key === key) + 1}`;
  const missing = missingRequired(rules);
  const flagged = rules.filter((r) => r.note).length;
  const hardCount = rules.filter((r) => r.kind === "hard" && r.body.trim()).length;
  const softCount = rules.filter((r) => r.kind === "soft" && r.body.trim()).length;

  const update = (key: string, patch: Partial<DraftRule>) =>
    setRules((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => setRules((rs) => rs.filter((r) => r.key !== key));
  const add = (section: Section) =>
    setRules((rs) => [...rs, { key: newKey(), section, kind: defaultKind(section), body: "" }]);
  const move = (key: string, dir: -1 | 1) =>
    setRules((rs) => {
      const r = rs.find((x) => x.key === key)!;
      const same = rs.filter((x) => x.section === r.section);
      const i = same.findIndex((x) => x.key === key);
      const j = i + dir;
      if (j < 0 || j >= same.length) return rs;
      [same[i], same[j]] = [same[j], same[i]];
      return orderRules([...rs.filter((x) => x.section !== r.section), ...same]);
    });

  async function save() {
    const clean = ordered.filter((r) => r.body.trim());
    if (missing.length) return setError(`Add at least one rule to: ${missing.join(", ")}.`);
    setSaving(true);
    setError(null);
    const { error } = await createClient().rpc("save_rulebook", {
      p_source: source,
      p_source_filename: filename ?? null,
      p_raw_text: rawText ?? null,
      p_rules: clean.map((r) => ({ section: r.section, kind: r.kind, body: r.body.trim() })),
    });
    setSaving(false);
    if (error) return setError(error.message);
    router.push("/rulebook?saved=1");
    router.refresh();
  }

  return (
    <main className="flex min-h-0 flex-1 gap-5 p-3 md:p-6 md:pt-5">
      <section className="flex min-w-0 flex-1 flex-col gap-3.5">
        {source === "upload" && (
          <div className="flex items-center gap-3.5 rounded-lg bg-brand/[.06] px-[18px] py-3.5 ring-1 ring-inset ring-brand/20">
            <FileText className="size-5 shrink-0 text-brand-soft" strokeWidth={1.6} />
            <p className="flex-1 text-sm leading-snug text-[#e4e4e8]">
              We found {rules.length} rule{rules.length === 1 ? "" : "s"} in {filename === "Pasted text" ? "your pasted text" : <span className="font-medium">{filename}</span>}.
              {flagged > 0 && ` ${flagged} ${flagged === 1 ? "is" : "are"} flagged for you to check.`} Hard rules can block a
              trade; soft rules can only add caution.
            </p>
          </div>
        )}
        <div className="onyx-card flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2 md:px-[18px]">
          {SECTIONS.map((s) => {
            const list = ordered.filter((r) => r.section === s.key);
            return (
              <div key={s.key} className="flex flex-col gap-1 border-b border-white/5 py-3 last:border-0">
                <div className="flex items-center gap-2.5 px-1 pb-1">
                  <span className="text-sm font-semibold tracking-[-0.01em]">{s.label}</span>
                  <span className="text-xs text-ink-muted">{s.required ? "Required" : "Optional"}</span>
                  <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs" onClick={() => add(s.key)}>
                    <Plus /> Add rule
                  </Button>
                </div>
                {list.length === 0 && <p className="px-1 pb-1 text-[13px] text-ink-muted">{s.hint}</p>}
                {list.map((r, i) => (
                  <div key={r.key} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 rounded-md px-1 py-1 sm:flex-nowrap">
                      <span className="num w-7 shrink-0 text-xs text-ink-muted">{codeOf(r.key)}</span>
                      <input
                        aria-label={`${codeOf(r.key)} text`}
                        value={r.body}
                        onChange={(e) => update(r.key, { body: e.target.value })}
                        placeholder="Write the rule in your own words"
                        className={cn("onyx-field order-last h-10 w-full min-w-0 px-3 text-sm text-ink placeholder:text-ink-muted sm:order-none sm:w-auto sm:flex-1", r.note && "border-prompt/45")}
                      />
                      <button
                        type="button"
                        onClick={() => update(r.key, { kind: (r.kind === "hard" ? "soft" : "hard") as Kind })}
                        aria-label={`${codeOf(r.key)} is ${r.kind}. Switch.`}
                        className={cn(
                          "ml-auto h-[30px] w-16 shrink-0 cursor-pointer rounded-full text-xs font-semibold transition-colors sm:ml-0",
                          r.kind === "hard" ? "bg-surface-raised text-[#e4e4e8]" : "bg-brand/[.12] text-brand-soft",
                        )}
                      >
                        {r.kind === "hard" ? "Hard" : "Soft"}
                      </button>
                      <div className="flex shrink-0 flex-col">
                        <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(r.key, -1)} className="cursor-pointer text-ink-muted hover:text-ink disabled:opacity-30">
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button type="button" aria-label="Move down" disabled={i === list.length - 1} onClick={() => move(r.key, 1)} className="cursor-pointer text-ink-muted hover:text-ink disabled:opacity-30">
                          <ArrowDown className="size-3.5" />
                        </button>
                      </div>
                      <button type="button" aria-label={`Remove ${codeOf(r.key)}`} onClick={() => remove(r.key)} className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm text-ink-muted hover:bg-surface-raised hover:text-ink">
                        <X className="size-3.5" />
                      </button>
                    </div>
                    {r.note && (
                      <div className="mb-1.5 ml-1 flex items-start gap-2 text-xs text-prompt sm:ml-10">
                        <CircleHelp className="mt-px size-3.5 shrink-0" />
                        <span className="flex-1">{r.note}</span>
                        <button type="button" onClick={() => update(r.key, { note: null })} className="cursor-pointer text-ink-muted hover:text-ink">
                          Looks right
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {error && <p role="alert" className="text-[13px] text-loss">{error}</p>}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : `Save as version ${nextVersion}`}</Button>
          {onStartOver && <Button variant="ghost" onClick={onStartOver}>Start over</Button>}
          <span className="ml-auto text-[13px] text-ink-muted">
            {hardCount} hard · {softCount} soft{missing.length ? ` · still needed: ${missing.join(", ")}` : ""}
          </span>
        </div>
      </section>

      <aside className="onyx-card hidden w-[360px] shrink-0 flex-col gap-3 overflow-y-auto p-[18px] xl:flex">
        {source === "upload" && rawText ? (
          <>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold tracking-[0.1em] text-ink-muted">SOURCE</span>
              <span className="text-sm">{filename}</span>
            </div>
            <pre className="whitespace-pre-wrap rounded-md bg-field p-3 font-sans text-[13px] leading-relaxed text-ink-soft">{rawText}</pre>
            {ignored.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold tracking-[0.1em] text-ink-muted">LEFT OUT</span>
                {ignored.map((g, i) => (
                  <div key={i} className="flex flex-col gap-0.5 rounded-md bg-field px-3 py-2">
                    <span className="text-[13px] text-ink-soft">{g.text}</span>
                    {g.reason && <span className="text-xs text-ink-muted">{g.reason}</span>}
                  </div>
                ))}
                <span className="text-xs leading-relaxed text-ink-muted">Add any of these by hand if you want them checked.</span>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="text-xs font-semibold tracking-[0.1em] text-ink-muted">HOW RULES ARE USED</span>
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Every check cites these rules by number. Tenet never adds outside rules, so anything you want enforced has to be written here.
            </p>
            <p className="text-[13px] leading-relaxed text-ink-soft">
              <span className="text-ink">Hard</span> rules can turn a trade into a NO GO. <span className="text-ink">Soft</span> rules can only add caution.
            </p>
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Rules phrased as a trigger, like &ldquo;wait for&rdquo; or &ldquo;only after&rdquo;, need you to confirm the trigger happened.
            </p>
            <p className="text-[13px] leading-relaxed text-ink-soft">Saving creates a new version. Past checks keep the version they ran against.</p>
          </>
        )}
      </aside>
    </main>
  );
}
