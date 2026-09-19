import { z } from "zod";

export const VERDICTS = ["GO AHEAD", "PROCEED WITH CAUTION", "NO GO", "PROMPT"] as const;
export type Verdict = (typeof VERDICTS)[number];

const str = z.string().nullish().transform((v) => (v && v.trim() ? v.trim() : null));

export const ExtractedPlan = z
  .object({
    pair: str,
    direction: z.string().nullish().transform((v) => (v ? v.toUpperCase() : null)),
    entry: str,
    stop: str,
    target: str,
    size_or_risk: str,
    rr_ratio: z.union([z.string(), z.number()]).nullish().transform((v) => (v === null || v === undefined || v === "" ? null : String(v))),
    reasoning: str,
    context: str,
  })
  .partial()
  .catch({});
export type ExtractedPlan = z.infer<typeof ExtractedPlan>;

export const EvalResponse = z.object({
  verdict_word: z.enum(VERDICTS),
  summary: z.string().default(""),
  rules: z
    .array(z.object({ status: z.enum(["Passed", "Failed", "Cannot evaluate"]), label: z.string(), explanation: z.string().default("") }))
    .default([]),
  closing_note: z.string().default(""),
  follow_up_question: z.string().nullish(),
  extracted_plan: ExtractedPlan.default({}),
});
export type EvalResponse = z.infer<typeof EvalResponse>;

export type RuleTone = "met" | "soft" | "broken" | "info";

/** Maps the model's rule status (plus tolerance / trigger tags) onto the four Onyx status pills. */
export function ruleTone(r: { status: string; explanation: string }): RuleTone {
  if (r.status === "Passed") return "met";
  if (r.status === "Cannot evaluate") return "info";
  return /^\s*\[(within tolerance|unconfirmed trigger)\]/i.test(r.explanation) ? "soft" : "broken";
}

export const TONE: Record<RuleTone, { label: string; fg: string; bg: string; row: string }> = {
  met: { label: "Met", fg: "text-go", bg: "bg-go/10", row: "" },
  soft: { label: "Soft fail", fg: "text-caution", bg: "bg-caution/[.12]", row: "bg-caution/[.05]" },
  broken: { label: "Broken", fg: "text-nogo", bg: "bg-nogo/[.12]", row: "bg-nogo/[.05]" },
  info: { label: "Can't tell", fg: "text-prompt", bg: "bg-prompt/[.12]", row: "" },
};

export const VERDICT_STYLE: Record<Verdict, { label: string; fg: string; chip: string; panel: string; solid: string }> = {
  "GO AHEAD": { label: "GO AHEAD", fg: "text-go", chip: "bg-go/[.14]", panel: "bg-go/[.06] ring-go/20 shadow-[0_24px_60px_-36px_rgba(61,214,140,.45)]", solid: "bg-go" },
  "PROCEED WITH CAUTION": { label: "PROCEED WITH CAUTION", fg: "text-caution", chip: "bg-caution/[.14]", panel: "bg-caution/[.06] ring-caution/20 shadow-[0_24px_60px_-36px_rgba(245,184,75,.45)]", solid: "bg-caution" },
  "NO GO": { label: "NO GO", fg: "text-nogo", chip: "bg-nogo/[.14]", panel: "bg-nogo/[.06] ring-nogo/20 shadow-[0_24px_60px_-36px_rgba(255,107,129,.45)]", solid: "bg-nogo" },
  PROMPT: { label: "NEEDS AN ANSWER", fg: "text-prompt", chip: "bg-prompt/[.14]", panel: "bg-prompt/[.06] ring-prompt/20", solid: "bg-prompt" },
};

/** Splits "What's good: … / What's bad: … / Motivation: …". Legacy single-string notes land in `other`. */
export function parseClosingNote(note: string | null | undefined) {
  const out: { good?: string; bad?: string; motivation?: string; other?: string } = {};
  if (!note) return out;
  const re = /(What['’]s good|What['’]s bad|Motivation)\s*:\s*/gi;
  const parts = note.split(re);
  if (parts.length < 3) return { other: note.trim() };
  for (let i = 1; i < parts.length; i += 2) {
    const k = parts[i].toLowerCase();
    const v = (parts[i + 1] ?? "").trim();
    if (k.includes("good")) out.good = v;
    else if (k.includes("bad")) out.bad = v;
    else out.motivation = v;
  }
  return out;
}

/** The plan details Tenet needs before a compliance check (mirrors the prompt's Phase 1). */
export function planChecklist(p: ExtractedPlan | null | undefined, charts: number) {
  const plan = p ?? {};
  const target = plan.target ?? (plan.rr_ratio ? `${plan.rr_ratio}R` : null);
  return [
    { key: "reasoning", label: "Reasoning", value: plan.reasoning ? "Captured" : null, optional: false },
    { key: "entry", label: "Entry", value: plan.entry ?? null, optional: false },
    { key: "stop", label: "Stop loss", value: plan.stop ?? null, optional: false },
    { key: "target", label: "Target or exit", value: target, optional: false },
    { key: "risk", label: "Risk", value: plan.size_or_risk ?? null, optional: false },
    { key: "chart", label: "Chart", value: charts ? `${charts} attached` : null, optional: true },
  ];
}
