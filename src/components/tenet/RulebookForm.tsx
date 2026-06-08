import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { RuleListEditor } from "./RuleListEditor";
import { RULEBOOK_KEY, loadRulebook, type Rulebook } from "@/lib/tenet/types";

type Mode = "new" | "edit";

const SECTIONS = [
  { key: "qualifying_criteria", title: "Qualifying criteria", helper: "Conditions the market must meet before you consider a trade.", placeholder: "e.g., Price above 200 EMA on H4", addLabel: "+ Add a criterion", required: true },
  { key: "entry_rules", title: "Entry rules", helper: "How and when you actually enter a position.", placeholder: "e.g., H1 close above prior session high", addLabel: "+ Add an entry rule", required: true },
  { key: "exit_rules", title: "Exit rules", helper: "Stops, targets, and invalidation conditions.", placeholder: "e.g., Stop below entry candle low", addLabel: "+ Add an exit rule", required: true },
  { key: "risk_management", title: "Risk / safety", helper: "Risk per trade, per day, per week.", placeholder: "e.g., 1% per trade", addLabel: "+ Add a risk rule", required: true },
  { key: "soft_meta_rules", title: "Soft meta-rules", helper: "Situations where you skip trading even if the setup looks good (news, holidays, fatigue, etc.).", placeholder: "e.g., No trades during NFP", addLabel: "+ Add a soft rule", required: false },
] as const;

export function RulebookForm({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const [strategyName, setStrategyName] = useState("");
  const [data, setData] = useState<Record<string, string[]>>({
    qualifying_criteria: [],
    entry_rules: [],
    exit_rules: [],
    risk_management: [],
    soft_meta_rules: [],
  });
  const [errors, setErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (mode === "edit") {
      const rb = loadRulebook();
      if (rb) {
        setStrategyName(rb.strategy_name ?? "");
        setData({
          qualifying_criteria: rb.qualifying_criteria ?? [],
          entry_rules: rb.entry_rules ?? [],
          exit_rules: rb.exit_rules ?? [],
          risk_management: rb.risk_management ?? [],
          soft_meta_rules: rb.soft_meta_rules ?? [],
        });
      }
    }
  }, [mode]);

  const handleSave = () => {
    const errs = new Set<string>();
    if (!strategyName.trim()) errs.add("strategy_name");
    for (const s of SECTIONS) {
      if (s.required && (data[s.key].filter((v) => v.trim()).length === 0)) errs.add(s.key);
    }
    setErrors(errs);
    if (errs.size > 0) {
      toast.error("Please complete all required sections");
      return;
    }
    const existing = loadRulebook();
    const rb: Rulebook = {
      strategy_name: strategyName.trim(),
      qualifying_criteria: data.qualifying_criteria.map((v) => v.trim()).filter(Boolean),
      entry_rules: data.entry_rules.map((v) => v.trim()).filter(Boolean),
      exit_rules: data.exit_rules.map((v) => v.trim()).filter(Boolean),
      risk_management: data.risk_management.map((v) => v.trim()).filter(Boolean),
      soft_meta_rules: data.soft_meta_rules.map((v) => v.trim()).filter(Boolean),
      activated_at: existing?.activated_at && mode === "edit" ? existing.activated_at : new Date().toISOString(),
    };
    localStorage.setItem(RULEBOOK_KEY, JSON.stringify(rb));
    if (mode === "new") {
      toast.success("Rulebook activated");
      setTimeout(() => navigate({ to: "/home" }), 1200);
    } else {
      toast.success("Rulebook saved");
    }
  };

  const handleDiscard = () => {
    if (mode === "edit") {
      const rb = loadRulebook();
      if (rb) {
        setStrategyName(rb.strategy_name);
        setData({
          qualifying_criteria: rb.qualifying_criteria,
          entry_rules: rb.entry_rules,
          exit_rules: rb.exit_rules,
          risk_management: rb.risk_management,
          soft_meta_rules: rb.soft_meta_rules,
        });
        toast.message("Changes discarded");
      }
    }
  };

  const existing = mode === "edit";

  return (
    <div className="pb-32">
      <div className="max-w-[880px] mx-auto px-8 pt-8">
        <div className="text-[13px] text-ink-secondary">
          Rulebook <span className="mx-1">›</span> {mode === "new" ? "New rulebook" : "Edit"}
        </div>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight">
          {mode === "new" ? "Set up your rulebook" : "Edit your rulebook"}
        </h1>
        <p className="mt-2 text-[14px] italic text-ink-secondary">
          Capture your strategy and the rules you trade by. Required sections are marked with *.
        </p>

        <div className="mt-8 flex flex-col gap-5">
          <SectionCard title="Strategy name" required helper="Give your strategy a name you'll recognise." error={errors.has("strategy_name")}>
            <input
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              maxLength={80}
              placeholder="e.g., London H1 Breakout"
              className="w-full px-3 py-2 text-[14px] rounded-md border border-border bg-surface focus:outline-none focus:border-teal"
            />
          </SectionCard>

          {SECTIONS.map((s) => (
            <SectionCard key={s.key} title={s.title} helper={s.helper} required={s.required} error={errors.has(s.key)}>
              <RuleListEditor
                values={data[s.key]}
                onChange={(next) => setData((d) => ({ ...d, [s.key]: next }))}
                placeholder={s.placeholder}
                addLabel={s.addLabel}
              />
            </SectionCard>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-[200px] right-0 bg-surface border-t border-border px-8 py-4 flex items-center justify-between z-10">
        {mode === "new" ? (
          <span className="text-[14px] text-ink-secondary cursor-not-allowed" title="Complete your rulebook to continue.">Cancel</span>
        ) : (
          <button onClick={handleDiscard} className="px-4 py-2 text-[14px] text-ink-secondary border border-border rounded-md hover:bg-[#F5F5F0]">
            Discard changes
          </button>
        )}
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-teal text-white text-[14px] font-medium rounded-md hover:opacity-90"
        >
          {existing ? "Save changes" : "Save & activate"}
        </button>
      </div>
    </div>
  );
}

function SectionCard({ title, helper, required, error, children }: { title: string; helper: string; required?: boolean; error?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-surface border rounded-lg p-5 ${error ? "border-[#DC2626]" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal">{title}</div>
        {required && <span className="text-[10px] uppercase tracking-wide text-ink-secondary border border-border rounded-full px-2 py-[1px]">* required</span>}
      </div>
      <p className="mt-1 text-[12px] text-ink-secondary">{helper}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
