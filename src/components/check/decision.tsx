"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Verdict } from "@/lib/tenet/eval";

export type DecisionValue = "taken" | "skipped" | "override";
const LABEL: Record<DecisionValue, string> = { taken: "Logged as taken", skipped: "Logged as skipped", override: "Logged as override. The NO GO stays on record." };

export function DecisionActions({ checkId, verdict, initial, stacked = false }: { checkId: string; verdict: Verdict; initial: DecisionValue | null; stacked?: boolean }) {
  const [decision, setDecision] = useState<DecisionValue | null>(initial);
  const [overriding, setOverriding] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (verdict === "PROMPT") return null;

  async function log(d: DecisionValue) {
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("decisions").upsert({ check_id: checkId, decision: d, decided_at: new Date().toISOString() });
    setBusy(false);
    if (error) return setError("Could not save your decision. Please try again.");
    setDecision(d);
    setOverriding(false);
    setConfirm("");
  }

  if (decision && !overriding) {
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-2 rounded-[10px] bg-surface-raised px-3 py-2 text-[13px] text-[#e4e4e8] ring-1 ring-inset ring-white/[.08]">
          <Check className="size-3.5 text-go" strokeWidth={2.4} />
          {LABEL[decision]}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setDecision(null)}>Change</Button>
      </div>
    );
  }

  const ready = confirm.trim().toUpperCase() === "ACCEPT VIOLATION";
  return (
    <div className="flex flex-col gap-2.5">
      <div className={stacked ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2.5"}>
        {verdict === "NO GO" ? (
          <>
            <Button disabled={busy} className="bg-nogo text-background" onClick={() => log("skipped")}>Skip this trade</Button>
            {!overriding && <Button variant="ghost" disabled={busy} className="text-loss hover:text-nogo" onClick={() => setOverriding(true)}>Accept violation…</Button>}
          </>
        ) : (
          <>
            <Button disabled={busy} className={verdict === "GO AHEAD" ? "bg-go text-background" : "bg-caution text-background"} onClick={() => log("taken")}>Log trade</Button>
            <Button variant="secondary" disabled={busy} onClick={() => log("skipped")}>Log skip</Button>
          </>
        )}
      </div>
      {overriding && (
        <div className="flex flex-col gap-2.5 rounded-[14px] bg-nogo/[.06] p-3.5 ring-1 ring-inset ring-nogo/25">
          <p className="text-[13px] leading-snug text-[#e4e4e8]">The NO GO verdict stays on record. This logs that you took the trade anyway. Type ACCEPT VIOLATION to continue.</p>
          <div className="flex gap-2">
            <input
              aria-label="Type ACCEPT VIOLATION to confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="ACCEPT VIOLATION"
              className="onyx-field num h-10 min-w-0 flex-1 border-nogo/30 bg-[#120b0d] px-3 text-[13px] text-ink"
            />
            <Button size="sm" className="h-10 bg-nogo text-background" disabled={!ready || busy} onClick={() => log("override")}>Log override</Button>
            <Button size="sm" variant="ghost" className="h-10" onClick={() => { setOverriding(false); setConfirm(""); }}>Cancel</Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-[13px] text-loss">{error}</p>}
    </div>
  );
}
