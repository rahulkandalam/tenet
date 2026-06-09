import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUp } from "lucide-react";
import { evaluateTrade } from "@/lib/tenet/evaluate.functions";
import { loadRulebook, type ChatMsg, type EvalResponse } from "@/lib/tenet/types";

export const Route = createFileRoute("/evaluate")({
  head: () => ({ meta: [{ title: "Evaluate — Tenet" }] }),
  component: EvaluatePage,
});

const INITIAL_MSG: ChatMsg = { role: "assistant", content: "What's the trade?" };

function parseResponse(raw: string): EvalResponse | null {
  let txt = raw.trim();
  txt = txt.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  try { return JSON.parse(txt) as EvalResponse; } catch { return null; }
}

function EvaluatePage() {
  const navigate = useNavigate();
  const callEval = useServerFn(evaluateTrade);
  const [messages, setMessages] = useState<ChatMsg[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<EvalResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 24 * 4 + 24) + "px";
    }
  }, [input]);

  const hasTraderMsg = messages.some((m) => m.role === "user");

  const onBack = () => {
    if (hasTraderMsg && !confirm("Leave this conversation? Your progress will be lost.")) return;
    navigate({ to: "/home" });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const rb = loadRulebook();
    if (!rb) { toast.error("No rulebook found"); return; }
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const history = next.slice(0, -1);
      const { content } = await callEval({ data: { rulebook: rb, history, latest: text } });
      const parsed = parseResponse(content);
      if (!parsed) {
        toast.error("Tenet's response couldn't be read. Try again.");
        setLoading(false);
        return;
      }
      setLatest(parsed);
      const aiText = parsed.verdict_word === "PROMPT"
        ? (parsed.follow_up_question || parsed.summary || "Tell me more.")
        : "OK, that's everything I need. Ready when you are.";
      setMessages([...next, { role: "assistant", content: aiText }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const runVerdict = () => {
    if (!latest) return;
    try { sessionStorage.setItem("tenet_verdict", JSON.stringify(latest)); } catch {}
    navigate({ to: "/verdict" });
  };

  const isFinal = latest && latest.verdict_word !== "PROMPT";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-12 px-5 flex items-center justify-between border-b border-border bg-surface">
        <button onClick={onBack} className="text-[14px] text-ink-secondary hover:text-ink">← Back to Home</button>
        <div className="text-[14px] text-ink-secondary flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" /> Evaluating your idea
        </div>
        <span className="text-[14px] text-ink-secondary cursor-default">Save as draft ▸</span>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Chat 60% */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border" style={{ flexBasis: "60%" }}>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-[720px] mx-auto flex flex-col gap-5">
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} text={m.content} />
              ))}
              {loading && (
                <div className="flex flex-col items-start gap-1.5">
                  <div className="text-[11px] text-ink-secondary flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-teal inline-block" /> Tenet</div>
                  <div className="bg-teal-soft border-l-2 border-teal rounded-md px-3 py-3">
                    <div className="flex gap-1.5">
                      <span className="tenet-dot w-1.5 h-1.5 rounded-full bg-teal inline-block" />
                      <span className="tenet-dot w-1.5 h-1.5 rounded-full bg-teal inline-block" />
                      <span className="tenet-dot w-1.5 h-1.5 rounded-full bg-teal inline-block" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-border bg-surface px-6 py-4">
            <div className="max-w-[720px] mx-auto flex items-end gap-3">
              <div className="w-8" />
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); send(); }
                }}
                rows={1}
                placeholder="Type your trade plan here..."
                className="flex-1 resize-none px-3 py-2.5 text-[14px] rounded-md border border-border bg-surface focus:outline-none focus:border-teal max-h-[120px]"
              />
              <div className="w-9" />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  input.trim() && !loading ? "bg-teal text-white hover:opacity-90" : "bg-[#E8E8E0] text-ink-secondary cursor-not-allowed"
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Plan 40% */}
        <div className="flex flex-col" style={{ flexBasis: "40%", maxWidth: 480 }}>
          <div className="px-5 h-12 flex flex-col justify-center border-b border-border">
            <div className="text-[13px] font-medium">Your trade plan</div>
            <div className="text-[11px] italic text-ink-secondary">Filling as we talk.</div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <PlanPanel ep={latest?.extracted_plan ?? null} />
          </div>
          <div className="border-t border-border px-5 py-4">
            <button
              onClick={runVerdict}
              disabled={!latest}
              className={`w-full px-4 py-2.5 rounded-md text-[14px] font-medium transition-colors ${
                isFinal
                  ? "bg-teal text-white hover:opacity-90"
                  : "border border-border text-ink-secondary bg-surface hover:bg-[#F5F5F0]"
              } ${!latest ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isFinal ? "Run my evaluation →" : "Run evaluation"}
            </button>
            <p className={`mt-2 text-[12px] italic text-center ${isFinal ? "text-teal" : "text-ink-secondary"}`}>
              {isFinal ? "Ready when you are." : "Tenet has open questions — answer above for the most useful verdict."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  if (role === "assistant") {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <div className="text-[11px] text-ink-secondary flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-teal inline-block" /> Tenet</div>
        <div className="bg-teal-soft border-l-2 border-teal rounded-md px-3 py-2.5 max-w-[70%] text-[14px] text-ink whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="text-[11px] text-ink-secondary">You</div>
      <div className="bg-[#F1F4F8] rounded-md px-3 py-2.5 max-w-[70%] text-[14px] text-ink whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}

function PlanPanel({ ep }: { ep: import("@/lib/tenet/types").ExtractedPlan | null }) {
  if (!ep) {
    return <div className="h-full flex items-center justify-center text-center text-[13px] italic text-ink-secondary px-6">Your trade plan will appear here as you tell me.</div>;
  }
  const rows: { label: string; value: string | null; computed?: boolean }[] = [
    { label: "Pair", value: ep.pair },
    { label: "Direction", value: ep.direction },
    { label: "Entry", value: ep.entry },
    { label: "Stop", value: ep.stop },
    { label: "Target", value: ep.target },
    { label: "Size / risk", value: ep.size_or_risk },
    { label: "R:R", value: ep.rr_ratio, computed: true },
    { label: "Reasoning", value: ep.reasoning },
    { label: "Context", value: ep.context },
  ];
  const visible = rows.filter((r) => r.value);
  if (visible.length === 0) {
    return <div className="h-full flex items-center justify-center text-center text-[13px] italic text-ink-secondary px-6">Your trade plan will appear here as you tell me.</div>;
  }
  return (
    <div className="flex flex-col gap-3.5">
      {visible.map((r) => (
        <div key={r.label}>
          <div className="flex items-center gap-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-ink-secondary">{r.label}</div>
            <span className="text-[10px] uppercase tracking-wide bg-[#F5F5F0] text-ink-secondary px-1.5 py-0.5 rounded">
              {r.computed ? "Computed" : "From your input"}
            </span>
          </div>
          <div className="mt-1 text-[14px] text-ink whitespace-pre-wrap">{r.value}</div>
        </div>
      ))}
    </div>
  );
}
