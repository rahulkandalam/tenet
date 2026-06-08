export type Rulebook = {
  strategy_name: string;
  qualifying_criteria: string[];
  entry_rules: string[];
  exit_rules: string[];
  risk_management: string[];
  soft_meta_rules: string[];
  activated_at?: string;
};

export type VerdictWord = "GO AHEAD" | "PROCEED WITH CAUTION" | "NO GO" | "PROMPT";

export type RuleResult = {
  status: "Passed" | "Failed" | "Cannot evaluate";
  label: string;
  explanation: string;
};

export type ExtractedPlan = {
  pair: string | null;
  direction: "LONG" | "SHORT" | null;
  entry: string | null;
  stop: string | null;
  target: string | null;
  size_or_risk: string | null;
  rr_ratio: string | null;
  reasoning: string | null;
  context: string | null;
};

export type EvalResponse = {
  verdict_word: VerdictWord;
  summary: string;
  rules: RuleResult[];
  closing_note: string;
  follow_up_question?: string;
  extracted_plan: ExtractedPlan;
};

export type ChatMsg = { role: "user" | "assistant"; content: string };

export const RULEBOOK_KEY = "tenet_rulebook";

export function loadRulebook(): Rulebook | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RULEBOOK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Rulebook;
  } catch {
    return null;
  }
}

export function isRulebookComplete(rb: Rulebook | null): boolean {
  return !!(
    rb &&
    typeof rb.strategy_name === "string" &&
    rb.strategy_name.trim().length > 0 &&
    Array.isArray(rb.qualifying_criteria) && rb.qualifying_criteria.length > 0 &&
    Array.isArray(rb.entry_rules) && rb.entry_rules.length > 0 &&
    Array.isArray(rb.exit_rules) && rb.exit_rules.length > 0 &&
    Array.isArray(rb.risk_management) && rb.risk_management.length > 0
  );
}
