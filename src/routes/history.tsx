import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/tenet/Sidebar";
import {
  loadHistory,
  formatHistoryTimestamp,
  type HistoryEntry,
} from "@/lib/tenet/types";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Trade history — Tenet" }] }),
  component: HistoryPage,
});

function verdictPillStyle(v: string) {
  if (v === "GO AHEAD") return { bg: "#DCF1E5", text: "#1D9E75", label: "GO" };
  if (v === "PROCEED WITH CAUTION") return { bg: "#FBF1DC", text: "#C77B23", label: "CAUTION" };
  if (v === "NO GO") return { bg: "#FBE4E4", text: "#DC2626", label: "NO GO" };
  return { bg: "#F5F5F0", text: "#6B6B66", label: v };
}

function HistoryPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  return (
    <AppShell>
      <div className="max-w-[900px] mx-auto px-8 py-10">
        <div className="text-[12px] text-ink-secondary">Trade history</div>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Trade history</h1>
        <p className="mt-2 text-[14px] italic text-ink-secondary">
          Your last 20 saved evaluations. Click any entry to revisit it.
        </p>

        <div className="mt-7">
          {entries === null ? null : entries.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-8 text-center">
              <h3 className="text-[16px] font-semibold text-ink">No saved trades yet</h3>
              <p className="mt-2 text-[14px] text-ink-secondary">
                Run a check and click "Save to history" on the verdict screen to start building your record.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.map((e) => {
                const pill = verdictPillStyle(e.verdict_word);
                return (
                  <li key={e.id}>
                    <button
                      onClick={() =>
                        navigate({ to: "/evaluate", search: { from: "history", id: e.id } as never })
                      }
                      className="w-full text-left bg-surface border border-[#ECEAE4] hover:border-[#D6D2C8] rounded-lg p-4 flex gap-4 items-start transition-colors"
                    >
                      <div
                        className="shrink-0 w-[80px] text-center rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
                        style={{ background: pill.bg, color: pill.text }}
                      >
                        {pill.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="text-[14px] font-semibold text-ink truncate">
                            {(e.pair ?? "—")}
                            {e.direction ? ` • ${e.direction[0].toUpperCase()}${e.direction.slice(1).toLowerCase()}` : ""}
                          </div>
                          <div className="text-[13px] text-ink-secondary shrink-0">
                            {formatHistoryTimestamp(e.timestamp)}
                          </div>
                        </div>
                        <div className="text-[13px] text-ink-secondary mt-0.5">
                          {e.rr ? `R:R ${e.rr}` : "R:R —"} • {e.risk ?? "—"} risk
                        </div>
                        <div className="text-[14px] text-ink mt-1.5 truncate">
                          {e.summary}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
