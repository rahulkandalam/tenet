export type Section = "qualifying" | "entry" | "exit" | "risk" | "soft";
export type Kind = "hard" | "soft";

export type DraftRule = {
  key: string; // client-only id for React lists
  section: Section;
  kind: Kind;
  body: string;
  note?: string | null; // why the AI flagged this rule for review
};

export type SavedRule = { code: string; section: Section; kind: Kind; body: string; position: number };

export const SECTIONS: { key: Section; label: string; required: boolean; hint: string }[] = [
  { key: "qualifying", label: "Qualifying criteria", required: true, hint: "When a setup is worth considering at all." },
  { key: "entry", label: "Entry rules", required: true, hint: "Where and how you get in." },
  { key: "exit", label: "Exit rules", required: true, hint: "Stops, targets and how you manage out." },
  { key: "risk", label: "Risk & safety", required: false, hint: "Size, daily loss limits, news and session rules." },
  { key: "soft", label: "Soft meta-rules", required: false, hint: "Discipline and state. Soft rules add caution, never block a trade." },
];

export const SECTION_KEYS = SECTIONS.map((s) => s.key);

export function defaultKind(section: Section): Kind {
  return section === "soft" ? "soft" : "hard";
}

export function newKey() {
  return Math.random().toString(36).slice(2, 10);
}

/** Orders rules by section, keeping their order within each section. Codes follow this order. */
export function orderRules<T extends { section: Section }>(rules: T[]): T[] {
  return SECTION_KEYS.flatMap((s) => rules.filter((r) => r.section === s));
}

export function missingRequired(rules: { section: Section; body: string }[]): string[] {
  return SECTIONS.filter((s) => s.required && !rules.some((r) => r.section === s.key && r.body.trim()))
    .map((s) => s.label);
}

/**
 * Maps a saved rulebook onto the structured shape the v1 system prompt expects, with each rule
 * prefixed by its code so verdict labels cite R1, R2 … Soft rules always go to soft_meta_rules.
 */
export function toPromptRulebook(rules: SavedRule[]) {
  const pick = (section: Section) =>
    rules.filter((r) => r.kind === "hard" && r.section === section).map((r) => `${r.code}: ${r.body}`);
  return {
    qualifying_criteria: pick("qualifying"),
    entry_rules: pick("entry"),
    exit_rules: pick("exit"),
    risk_management: pick("risk"),
    soft_meta_rules: rules.filter((r) => r.kind === "soft").map((r) => `${r.code}: ${r.body}`),
  };
}
