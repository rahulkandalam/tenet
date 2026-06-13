export type RulebookFormat = "structured" | "free_text";

export type Rulebook = {
  format?: RulebookFormat;
  // structured fields
  strategy_name: string;
  qualifying_criteria: string[];
  entry_rules: string[];
  exit_rules: string[];
  risk_management: string[];
  soft_meta_rules: string[];
  activated_at?: string;
  // free_text fields
  text?: string;
  source_filename?: string;
  uploaded_at?: string;
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

// Legacy / global keys
export const LEGACY_RULEBOOK_KEY = "tenet_rulebook";
export const AUTHED_KEY = "tenet_authed";
export const CURRENT_USER_KEY = "tenet_current_user";
export const KNOWN_USERS_KEY = "tenet_known_users";

// Kept as named export for backward compatibility with anywhere still importing it.
export const RULEBOOK_KEY = LEGACY_RULEBOOK_KEY;

export const DAILY_LIMIT = 7;

export function getCurrentUser(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CURRENT_USER_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(AUTHED_KEY) === "true";
  } catch {
    return false;
  }
}

export function rulebookKeyFor(user: string): string {
  return `tenet_${user}_rulebook`;
}

export function todayLocalISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function evalCountKey(user: string, date = todayLocalISO()): string {
  return `tenet_${user}_evals_${date}`;
}

export function getEvalCount(user: string, date = todayLocalISO()): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = localStorage.getItem(evalCountKey(user, date));
    const n = v ? parseInt(v, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function incrementEvalCount(user: string, date = todayLocalISO()): number {
  const next = getEvalCount(user, date) + 1;
  try {
    localStorage.setItem(evalCountKey(user, date), String(next));
  } catch {
    // ignore
  }
  return next;
}

export function loadRulebook(): Rulebook | null {
  if (typeof window === "undefined") return null;
  try {
    const user = getCurrentUser();
    const key = user ? rulebookKeyFor(user) : LEGACY_RULEBOOK_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Rulebook;
  } catch {
    return null;
  }
}

export function loadRulebookFor(user: string): Rulebook | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(rulebookKeyFor(user));
    if (!raw) return null;
    return JSON.parse(raw) as Rulebook;
  } catch {
    return null;
  }
}

export function isRulebookComplete(rb: Rulebook | null): boolean {
  if (!rb) return false;
  if (rb.format === "free_text") {
    return typeof rb.text === "string" && rb.text.trim().length > 0;
  }
  return !!(
    typeof rb.strategy_name === "string" &&
    rb.strategy_name.trim().length > 0 &&
    Array.isArray(rb.qualifying_criteria) && rb.qualifying_criteria.length > 0 &&
    Array.isArray(rb.entry_rules) && rb.entry_rules.length > 0 &&
    Array.isArray(rb.exit_rules) && rb.exit_rules.length > 0
  );
}

export function getRulebookFormat(rb: Rulebook | null): RulebookFormat | null {
  if (!rb) return null;
  return rb.format ?? "structured";
}
