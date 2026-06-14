import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X, CircleDot, Bookmark, ThumbsUp, ThumbsDown } from "lucide-react";
import {
  findHistoryEntry,
  hashVerdictId,
  loadFeedbackMap,
  relativeTime,
  saveFeedback,
  saveHistoryEntry,
  type EvalResponse,
  type HistoryEntry,
  type VerdictFeedback,
} from "@/lib/tenet/types";

export const Route = createFileRoute("/verdict")({
  head: () => ({ meta: [{ title: "Verdict — Tenet" }] }),
  component: VerdictPage,
});

function parseClosingNote(note: string | null | undefined): {
  whats_good?: string;
  whats_bad?: string;
  motivation?: string;
  legacy?: string;
} {
  if (!note || typeof note !== "string") return {};
  const sections: { whats_good?: string; whats_bad?: string; motivation?: string; legacy?: string } = {};
  const lines = note.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^What['\u2019]s good:/i.test(line)) {
      sections.whats_good = line.replace(/^What['\u2019]s good:\s*/i, "").trim();
    } else if (/^What['\u2019]s bad:/i.test(line)) {
      sections.whats_bad = line.replace(/^What['\u2019]s bad:\s*/i, "").trim();
    } else if (/^Motivation:/i.test(line)) {
      sections.motivation = line.replace(/^Motivation:\s*/i, "").trim();
    }
  }
  if (!sections.whats_good && !sections.whats_bad && !sections.motivation) {
    sections.legacy = note;
  }
  return sections;
}

function VerdictPage() {
  const navigate = useNavigate();
  const [verdict, setVerdict] = useState<EvalResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<HistoryEntry | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      const entry = findHistoryEntry(id);
      if (!entry) {
        toast.error("That trade is no longer in your history");
        navigate({ to: "/history", replace: true });
        return;
      }
      setHistoryEntry(entry);
      setVerdict(entry.verdict_full);
    } else {
      try {
        const raw = sessionStorage.getItem("tenet_verdict");
        if (raw) setVerdict(JSON.parse(raw) as EvalResponse);
      } catch {
        // ignore
      }
    }
    setHydrated(true);
  }, [navigate]);

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideText, setOverrideText] = useState("");

  const [feedback, setFeedback] = useState<VerdictFeedback | null>(null);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  const verdictId = useMemo(() => {
    if (historyEntry) return historyEntry.id;
    if (verdict) return hashVerdictId(verdict);
    return "";
  }, [historyEntry, verdict]);

  useEffect(() => {
    if (!verdictId) return;
    const map = loadFeedbackMap();
    let fb: VerdictFeedback | null = map[verdictId] ?? null;
    if (!fb && historyEntry?.feedback_rating) {
      fb = {
        rating: historyEntry.feedback_rating,
        comment: historyEntry.feedback_comment ?? "",
        timestamp: historyEntry.timestamp,
        verdict_word: historyEntry.verdict_word,
      };
    }
    if (fb) {
      setFeedback(fb);
      setCommentDraft(fb.comment);
    }
  }, [verdictId, historyEntry]);

  const onFeedback = (rating: "up" | "down") => {
    if (!verdict || !verdictId || feedback) return;
    const fb: VerdictFeedback = {
      rating,
      comment: "",
      timestamp: new Date().toISOString(),
      verdict_word: verdict.verdict_word,
    };
    setFeedback(fb);
    saveFeedback(verdictId, fb);
    if (rating === "up") {
      toast.success("Thanks for the feedback", { duration: 3000 });
    } else {
      toast("Thanks for the feedback", {
        duration: 3000,
        icon: <ThumbsDown className="w-4 h-4 text-[#B85E00]" />,
      });
      setShowCommentBox(true);
    }
  };

  const submitComment = () => {
    if (!feedback || !verdictId) return;
    const trimmed = commentDraft.trim().slice(0, 280);
    const updated: VerdictFeedback = { ...feedback, comment: trimmed };
    setFeedback(updated);
    saveFeedback(verdictId, updated);
    setShowCommentBox(false);
    toast.success("Comment saved", { duration: 2500 });
  };

  const sections = useMemo(() => parseClosingNote(verdict?.closing_note), [verdict]);

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!verdict) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-ink-secondary">No verdict to display.</p>
          <button onClick={() => navigate({ to: "/home" })} className="mt-4 text-teal hover:underline">Back to Home</button>
        </div>
      </div>
    );
  }

  const w = verdict.verdict_word;
  const ep = verdict.extracted_plan;
  const palette =
    w === "GO AHEAD" ? { text: "text-[#0E7C5A]", bg: "bg-[#E6F4EF]", border: "border-l-[#0E7C5A]" } :
    w === "PROCEED WITH CAUTION" ? { text: "text-[#B85E00]", bg: "bg-[#FDF1DC]", border: "border-l-[#B85E00]" } :
    w === "NO GO" ? { text: "text-[#B91C1C]", bg: "bg-[#FBE9E9]", border: "border-l-[#B91C1C]" } :
    { text: "text-ink", bg: "bg-[#F5F5F0]", border: "border-l-border" };

  const chips: { label: string; value: string | null }[] = [
    { label: "pair", value: ep.pair },
    { label: "direction", value: ep.direction },
    { label: "et", value: ep.entry && ep.target ? `${ep.entry} → ${ep.target}` : null },
    { label: "size", value: ep.size_or_risk },
    { label: "rr", value: ep.rr_ratio ? `R:R ${ep.rr_ratio}` : null },
  ].filter((c) => c.value);

  const onOverride = () => {
    if (overrideText !== "ACCEPT VIOLATION") return;
    setOverrideOpen(false);
    setOverrideText("");
    toast.error("Override recorded. Trade not endorsed by Tenet.");
  };

  const hasStructured = sections.whats_good || sections.whats_bad || sections.motivation;
  const hasClosing = hasStructured || sections.legacy;
  const isHistoryView = !!historyEntry;
  const canSave = !isHistoryView && w !== "PROMPT";

  const onSaveToHistory = () => {
    if (!verdict || saved) return;
    try {
      const raw = sessionStorage.getItem("tenet_conversation_in_flight");
      let convEntries: unknown[] = [];
      let convImages: unknown[] = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.entries)) convEntries = parsed.entries;
        if (parsed && Array.isArray(parsed.attachedImages)) convImages = parsed.attachedImages;
      }
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        pair: ep.pair,
        direction: ep.direction,
        risk: ep.size_or_risk,
        rr: ep.rr_ratio,
        verdict_word: w,
        summary: verdict.summary,
        conversation: {
          entries: convEntries,
          attached_images: convImages,
          extracted_plan: ep,
        },
        verdict_full: verdict,
      };
      saveHistoryEntry(entry);
      setSaved(true);
      toast.success("Saved to history", { duration: 3000 });
    } catch {
      toast.error("Couldn't save to history");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-12 px-5 flex items-center justify-between border-b border-border bg-surface">
        <button
          onClick={() => navigate({ to: isHistoryView ? "/history" : "/evaluate" })}
          className="text-[14px] text-ink-secondary hover:text-ink"
        >
          ← {isHistoryView ? "Back to history" : "Back to conversation"}
        </button>
        <div className="text-[14px] text-ink-secondary flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" /> Trade check verdict
        </div>
        <span className="w-32" />
      </header>

      <div className="max-w-[900px] mx-auto w-full px-8 pt-10 pb-16">
        {w === "PROMPT" ? (
          <div className="p-6 rounded-lg bg-[#F5F5F0] text-ink-secondary text-center">
            Tenet still has open questions — return to the conversation to provide more detail.
          </div>
        ) : (
          <>
            <div className={`p-6 rounded-lg border-l-4 ${palette.border} ${palette.bg}`}>
              <div className={`text-[56px] font-bold leading-none ${palette.text}`}>{w}</div>
              <div className={`mt-3 text-[16px] italic ${palette.text}`}>{verdict.summary}</div>
            </div>

            {chips.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <span key={c.label} className="px-2.5 py-1 bg-[#F5F5F0] text-ink rounded text-[12px]">{c.value}</span>
                ))}
              </div>
            )}

            {hasClosing && (
              <div className="my-6 bg-surface border border-[#ECEAE4] rounded-lg p-5 flex flex-col gap-4">
                {sections.whats_good && (
                  <div>
                    <div className="uppercase tracking-[0.14em] text-[11px] font-semibold mb-1 text-[#1D9E75]">What's good</div>
                    <div className="text-[14px] text-ink leading-[1.5]">{sections.whats_good}</div>
                  </div>
                )}
                {sections.whats_bad && (
                  <div>
                    <div className="uppercase tracking-[0.14em] text-[11px] font-semibold mb-1 text-[#C77B23]">What's bad</div>
                    <div className="text-[14px] text-ink leading-[1.5]">{sections.whats_bad}</div>
                  </div>
                )}
                {sections.motivation && (
                  <div className="border-t border-[#ECEAE4] pt-3">
                    <div className="italic text-[14px] text-[#555] text-center">"{sections.motivation}"</div>
                  </div>
                )}
                {sections.legacy && (
                  <div className="text-[14px] text-ink leading-[1.5]">{sections.legacy}</div>
                )}
              </div>
            )}

            <div className="mt-8 mb-4 text-[11px] uppercase tracking-[0.14em] text-ink-secondary">
              Rules checked · {verdict.rules.length}
            </div>

            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              {verdict.rules.map((r, i) => (
                <div key={i} className={`flex items-start gap-3 px-5 py-4 ${i < verdict.rules.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="mt-0.5 shrink-0">
                    {r.status === "Passed" && <Check className="w-4 h-4 text-[#0E7C5A]" />}
                    {r.status === "Failed" && <X className="w-4 h-4 text-[#B91C1C]" />}
                    {r.status === "Cannot evaluate" && <CircleDot className="w-4 h-4 text-[#B85E00]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-ink">{r.label}</div>
                    <div className={`mt-1 text-[13px] ${r.status === "Failed" ? palette.text : "text-ink-secondary"}`}>{r.explanation}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-5 border-t border-border flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {isHistoryView ? (
                  <button
                    onClick={() => navigate({ to: "/history" })}
                    className="px-4 py-2 border border-[#ECEAE4] text-ink-secondary rounded-lg text-[14px] hover:bg-[#F5F5F0]"
                  >
                    Back to history
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      try { sessionStorage.removeItem("tenet_verdict"); } catch { /* ignore */ }
                      navigate({ to: "/evaluate" });
                    }}
                    className="px-4 py-2 border border-border text-ink-secondary rounded-md text-[14px] hover:bg-[#F5F5F0]"
                  >
                    Edit trade plan
                  </button>
                )}
                {isHistoryView ? (
                  <span className="text-[13px] text-ink-secondary italic">
                    Saved {relativeTime(historyEntry!.timestamp)}
                  </span>
                ) : canSave ? (
                  <button
                    onClick={onSaveToHistory}
                    disabled={saved}
                    className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-[14px] transition-colors ${
                      saved
                        ? "border-[#ECEAE4] text-teal cursor-default"
                        : "border-[#ECEAE4] text-ink-secondary hover:bg-[#F5F5F0]"
                    }`}
                  >
                    {saved ? <Check className="w-4 h-4 text-teal" /> : <Bookmark className="w-4 h-4" />}
                    {saved ? "Saved" : "Save to history"}
                  </button>
                ) : null}
              </div>
              {w === "GO AHEAD" && (
                <button className="px-5 py-2.5 bg-teal text-white rounded-md text-[14px] font-medium" onClick={() => toast.success("Acknowledged")}>Acknowledge & proceed</button>
              )}
              {w === "PROCEED WITH CAUTION" && (
                <button className="px-5 py-2.5 bg-[#B85E00] text-white rounded-md text-[14px] font-medium" onClick={() => toast.message("Proceeding with caution")}>Proceed with caution</button>
              )}
              {w === "NO GO" && (
                <button className="px-5 py-2.5 bg-[#B91C1C] text-white rounded-md text-[14px] font-medium" onClick={() => setOverrideOpen(true)}>Override declaration ▸</button>
              )}
            </div>
          </>
        )}
      </div>

      {overrideOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-surface rounded-lg border border-border p-6 max-w-[440px] w-full">
            <h3 className="text-[16px] font-semibold">Override the verdict?</h3>
            <p className="mt-2 text-[13px] text-ink-secondary">Type <span className="font-mono">ACCEPT VIOLATION</span> below to confirm you're knowingly breaking your own rules.</p>
            <input
              value={overrideText}
              onChange={(e) => setOverrideText(e.target.value)}
              placeholder="Type ACCEPT VIOLATION"
              className="mt-4 w-full px-3 py-2 text-[14px] border border-border rounded-md focus:outline-none focus:border-teal"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setOverrideOpen(false); setOverrideText(""); }} className="px-4 py-2 text-[14px] border border-border rounded-md text-ink-secondary">Cancel</button>
              <button
                onClick={onOverride}
                disabled={overrideText !== "ACCEPT VIOLATION"}
                className={`px-4 py-2 text-[14px] rounded-md text-white ${overrideText === "ACCEPT VIOLATION" ? "bg-[#B91C1C]" : "bg-[#B91C1C] opacity-40 cursor-not-allowed"}`}
              >Override</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
