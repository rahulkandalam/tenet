import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUp, Paperclip, Mic, Check, X, Loader2 } from "lucide-react";
import { evaluateTrade, transcribeAudio } from "@/lib/tenet/evaluate.functions";
import {
  loadRulebook,
  getCurrentUser,
  getEvalCount,
  incrementEvalCount,
  findHistoryEntry,
  relativeTime,
  DAILY_LIMIT,
  type EvalResponse,
  type HistoryEntry,
} from "@/lib/tenet/types";

export const Route = createFileRoute("/evaluate")({
  head: () => ({ meta: [{ title: "Evaluate — Tenet" }] }),
  component: EvaluatePage,
});

type AttachedImage = { id: string; name: string; dataUrl: string };
type ChatEntry =
  | { kind: "text"; role: "user" | "assistant"; content: string; refImageId?: string }
  | { kind: "image"; role: "user"; imageId: string };

const INITIAL: ChatEntry = { kind: "text", role: "assistant", content: "What's the trade?" };

function parseResponse(raw: string): EvalResponse | null {
  let txt = raw.trim();
  txt = txt
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(txt) as EvalResponse;
  } catch {
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      resolve(s.includes(",") ? s.split(",")[1] : s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function EvaluatePage() {
  const navigate = useNavigate();
  const callEval = useServerFn(evaluateTrade);
  const callTranscribe = useServerFn(transcribeAudio);

  const [entries, setEntries] = useState<ChatEntry[]>([INITIAL]);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [referencedIds, setReferencedIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState<EvalResponse | null>(null);
  const [lightbox, setLightbox] = useState<AttachedImage | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<AttachedImage | null>(null);
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<HistoryEntry | null>(null);
  const isHistory = !!historyEntry;

  // ai progress state
  const [aiProgress, setAiProgress] = useState(0);
  const [aiElapsed, setAiElapsed] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // mic state
  const [micState, setMicState] = useState<"idle" | "recording" | "stopped">("idle");
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const sendOnStopRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const prevEntriesLenRef = useRef(0);
  const prevLoadingRef = useRef(false);

  const startAiProgress = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    const start = Date.now();
    setAiProgress(0);
    setAiElapsed(0);
    progressIntervalRef.current = setInterval(() => {
      const ms = Date.now() - start;
      setAiElapsed(Math.floor(ms / 1000));
      const t = ms / 1000;
      const p = t < 20 ? (t / 20) * 90 : 90 + 10 * (1 - Math.exp(-(t - 20) / 15));
      setAiProgress(p);
    }, 50);
  };
  const stopAiProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };
  useEffect(() => () => stopAiProgress(), []);

  // Hydrate: history-view mode OR in-flight conversation
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      const id = params.get("id");
      if (from === "history" && id) {
        const entry = findHistoryEntry(id);
        if (!entry) {
          toast.error("That trade is no longer in your history");
          navigate({ to: "/history", replace: true });
          return;
        }
        setHistoryEntry(entry);
        const conv = entry.conversation;
        if (Array.isArray(conv.entries) && conv.entries.length > 0) {
          setEntries(conv.entries as ChatEntry[]);
        }
        if (Array.isArray(conv.attached_images)) {
          setAttachedImages(conv.attached_images as AttachedImage[]);
        }
        setLatest(entry.verdict_full);
        setHydrated(true);
        return;
      }
      const raw = sessionStorage.getItem("tenet_conversation_in_flight");
      if (raw) {
        const s = JSON.parse(raw) as {
          entries?: ChatEntry[];
          attachedImages?: AttachedImage[];
          referencedIds?: string[];
          latest?: EvalResponse | null;
        };
        if (s.entries && Array.isArray(s.entries) && s.entries.length > 0) {
          setEntries(s.entries);
          if (s.attachedImages) setAttachedImages(s.attachedImages);
          if (s.referencedIds) setReferencedIds(new Set(s.referencedIds));
          if (s.latest) setLatest(s.latest);
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
    setTimeout(() => taRef.current?.focus(), 50);
  }, [navigate]);

  // Persist on change (skip in history-view mode)
  useEffect(() => {
    if (!hydrated || isHistory) return;
    try {
      const payload = {
        entries,
        attachedImages,
        referencedIds: Array.from(referencedIds),
        latest,
        updated_at: new Date().toISOString(),
      };
      sessionStorage.setItem("tenet_conversation_in_flight", JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [entries, attachedImages, referencedIds, latest, hydrated, isHistory]);

  useEffect(() => {
    const lenIncreased = entries.length > prevEntriesLenRef.current;
    const loadingTurnedOn = loading && !prevLoadingRef.current;
    if (lenIncreased || loadingTurnedOn) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
    prevEntriesLenRef.current = entries.length;
    prevLoadingRef.current = loading;
  }, [entries, loading]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 24 * 4 + 24) + "px";
    }
  }, [input]);

  const hasTraderMsg = entries.some((e) => e.role === "user");
  const imgById = (id: string) => attachedImages.find((i) => i.id === id);

  const onBack = () => {
    if (hasTraderMsg && !confirm("Leave this conversation? Your progress will be lost.")) return;
    navigate({ to: "/home" });
  };

  // === Image attach ===
  const onPickFile = () => fileRef.current?.click();
  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (attachedImages.length >= 3) {
        toast.error("Up to 3 images per evaluation. Remove one to add another.");
        break;
      }
      try {
        const dataUrl = await fileToDataUrl(f);
        const id = crypto.randomUUID();
        setAttachedImages((p) => [...p, { id, name: f.name, dataUrl }]);
        setEntries((p) => [...p, { kind: "image", role: "user", imageId: id }]);
      } catch {
        toast.error(`Couldn't read ${f.name}`);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const doRemoveImage = (img: AttachedImage) => {
    setAttachedImages((p) => p.filter((i) => i.id !== img.id));
    setEntries((p) => p.filter((e) => !(e.kind === "image" && e.imageId === img.id)));
    setReferencedIds((p) => {
      const n = new Set(p);
      n.delete(img.id);
      return n;
    });
  };
  const removeImage = (img: AttachedImage) => {
    if (referencedIds.has(img.id)) setConfirmRemove(img);
    else doRemoveImage(img);
  };

  // === Mic ===
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (blob.size === 0) {
          setMicState("idle");
          return;
        }
        setMicState("stopped");
        setTimeout(() => setMicState("idle"), 400);
        setTranscribing(true);
        try {
          const b64 = await blobToBase64(blob);
          const { text } = await callTranscribe({
            data: { audioBase64: b64, mimeType: blob.type },
          });
          const shouldSendImmediately = sendOnStopRef.current;
          sendOnStopRef.current = false;
          if (shouldSendImmediately && text.trim()) {
            setTranscribing(false);
            await sendMessage(text.trim());
          } else {
            setInput((prev) => (prev ? prev + " " : "") + text);
            setTranscribing(false);
          }
        } catch (e) {
          setTranscribing(false);
          sendOnStopRef.current = false;
          toast.error("Couldn't transcribe — try again or type your message");
          void e;
        }
      };
      rec.start();
      recorderRef.current = rec;
      setMicState("recording");
    } catch {
      toast.error("Mic permission required to use voice input");
      setMicState("idle");
    }
  };

  const stopRecording = () => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    recorderRef.current = null;
  };

  const toggleMic = () => {
    if (micState === "recording") stopRecording();
    else if (micState === "idle") void startRecording();
  };

  // === Send ===
  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (loading) return;
    if (!text && attachedImages.length === 0) return;
    const rb = loadRulebook();
    if (!rb) {
      toast.error("No rulebook found");
      return;
    }
    const user = getCurrentUser();
    if (!user) {
      toast.error("No active user. Please sign in again.");
      return;
    }
    // Rate limit
    if (getEvalCount(user) >= DAILY_LIMIT) {
      toast.error("You've used today's 7 evaluations. The limit resets at midnight.", {
        duration: 6000,
      });
      setRetryAvailable(false);
      return;
    }

    const priorEntries = entries;
    const currentImageIds = attachedImages.map((i) => i.id);
    const newEntries: ChatEntry[] = text
      ? [...entries, { kind: "text", role: "user", content: text }]
      : [...entries];
    setEntries(newEntries);
    setInput("");
    setLoading(true);
    startAiProgress();
    setRetryAvailable(false);

    const rollback = (friendly: string) => {
      stopAiProgress();
      setEntries(priorEntries);
      setInput(text);
      setRetryAvailable(true);
      toast.error(friendly, { duration: 6000 });
    };

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setLoading(false);
      rollback("You're offline. Reconnect and try again. Your plan is saved.");
      return;
    }

    incrementEvalCount(user);

    try {
      const fullHistory = newEntries
        .filter((e): e is Extract<ChatEntry, { kind: "text" }> => e.kind === "text")
        .slice(0, -1)
        .map((e) => ({ role: e.role, content: e.content }));
      const history = fullHistory.slice(-8);
      const payload = {
        rulebook: rb,
        history,
        latest: text,
        images: attachedImages.map((i) => ({ dataUrl: i.dataUrl })),
      };
      const result = await callEval({ data: payload });
      if (result.error === "timeout") {
        rollback("Evaluation took too long. Your plan is saved — retry?");
        return;
      }
      const { content } = result;
      const parsed = parseResponse(content);
      if (!parsed) {
        rollback("Tenet's response couldn't be read. Your plan is saved — retry?");
        return;
      }
      // Snap progress to 100, brief pause for the bar to fill, then commit.
      setAiProgress(100);
      await new Promise((r) => setTimeout(r, 150));
      stopAiProgress();
      setLatest(parsed);
      const aiText =
        parsed.verdict_word === "PROMPT"
          ? parsed.follow_up_question || parsed.summary || "Tell me more."
          : "OK, that's everything I need. Ready when you are.";
      const refsChart =
        /chart shows|i can see|the image|in the chart|on the chart/i.test(aiText) ||
        /chart shows|i can see|the image|in the chart|on the chart/i.test(parsed.summary || "");
      const refImageId =
        refsChart && currentImageIds.length
          ? currentImageIds[currentImageIds.length - 1]
          : undefined;
      if (refImageId) setReferencedIds((p) => new Set(p).add(refImageId));
      setEntries([...newEntries, { kind: "text", role: "assistant", content: aiText, refImageId }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      let friendly = "Service error. Your plan is saved — retry?";
      if (e instanceof TypeError || /network|fetch failed/i.test(msg)) {
        friendly = "You're offline. Reconnect and try again. Your plan is saved.";
      } else if (/429|overload|rate.?limit|busy/i.test(msg)) {
        friendly = "OpenAI is busy. Try again in a moment. Your plan is saved.";
      } else if (/timeout|timed out|aborted|504/i.test(msg)) {
        friendly = "Evaluation took too long. Your plan is saved — retry?";
      }
      rollback(friendly);
    } finally {
      stopAiProgress();
      setLoading(false);
    }
  };

  const onSendClick = () => {
    if (micState === "recording") {
      sendOnStopRef.current = true;
      stopRecording();
      return;
    }
    void sendMessage();
  };

  const runVerdict = () => {
    if (isHistory && historyEntry) {
      navigate({ to: "/verdict", search: { id: historyEntry.id } as never });
      return;
    }
    if (!latest) return;
    try {
      sessionStorage.setItem("tenet_verdict", JSON.stringify(latest));
    } catch {
      // Ignore storage failures and still navigate with the in-memory verdict state.
    }
    navigate({ to: "/verdict" });
  };

  const startNewTrade = () => {
    try {
      sessionStorage.removeItem("tenet_conversation_in_flight");
      sessionStorage.removeItem("tenet_verdict");
    } catch {
      // ignore
    }
    window.location.assign("/evaluate");
  };

  const isFinal = latest && latest.verdict_word !== "PROMPT";
  const canSend =
    (input.trim().length > 0 || micState === "recording") && !loading && !transcribing && !isHistory;

  return (
    <div className="h-[100dvh] overflow-hidden bg-background flex flex-col">

      <header className="h-12 px-5 flex items-center justify-between border-b border-border bg-surface">
        <button onClick={onBack} className="text-[14px] text-ink-secondary hover:text-ink">
          ← Back to Home
        </button>
        <div className="text-[14px] text-ink-secondary flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" /> Evaluating your idea
        </div>
        <button
          onClick={() => {
            if (hasTraderMsg && !confirm("Start a new trade? Current conversation will be cleared.")) return;
            try {
              sessionStorage.removeItem("tenet_conversation_in_flight");
              sessionStorage.removeItem("tenet_verdict");
            } catch {
              // ignore
            }
            setEntries([INITIAL]);
            setAttachedImages([]);
            setReferencedIds(new Set());
            setLatest(null);
            setInput("");
            setRetryAvailable(false);
            setTimeout(() => taRef.current?.focus(), 50);
          }}
          className="text-[14px] text-ink-secondary hover:text-teal"
        >
          New trade
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Chat 60% */}
        <div
          className="flex-1 flex flex-col min-w-0 border-r border-border"
          style={{ flexBasis: "60%" }}
        >
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-[720px] mx-auto flex flex-col gap-5">
              {isHistory && historyEntry && (
                <div className="flex items-center justify-between gap-3 bg-[#F5F2EB] rounded-md px-3 py-2">
                  <div className="text-[13px] text-ink">
                    Viewing past trade · {relativeTime(historyEntry.timestamp)}
                  </div>
                  <button
                    onClick={startNewTrade}
                    className="px-3 py-1.5 bg-teal text-white text-[13px] font-medium rounded-md hover:opacity-90"
                  >
                    Start new trade
                  </button>
                </div>
              )}
              {entries.map((e, i) => {
                if (e.kind === "image") {
                  const img = imgById(e.imageId);
                  if (!img) return null;
                  return (
                    <div key={i} className="flex flex-col items-end gap-1.5">
                      <div className="text-[11px] text-ink-secondary">You</div>
                      <div className="bg-[#F1F4F8] rounded-md p-2 max-w-[70%] relative group">
                        <button
                          onClick={() => removeImage(img)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <img
                          src={img.dataUrl}
                          alt={img.name}
                          onClick={() => setLightbox(img)}
                          className="rounded-md border border-[#ECEAE4] cursor-zoom-in object-cover"
                          style={{ width: 140, height: 90 }}
                        />
                        <div
                          className="text-[11px] text-ink-secondary mt-1 truncate"
                          style={{ maxWidth: 140 }}
                        >
                          {img.name}
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <TextBubble
                    key={i}
                    entry={e}
                    img={e.refImageId ? imgById(e.refImageId) : undefined}
                    onImg={(im) => setLightbox(im)}
                  />
                );
              })}
              {(() => {
                const lastEntry = entries[entries.length - 1];
                const showQuickReplies =
                  !loading &&
                  !isHistory &&
                  latest?.verdict_word === "PROMPT" &&
                  lastEntry?.kind === "text" &&
                  lastEntry.role === "assistant";
                if (!showQuickReplies) return null;
                const fq = latest?.follow_up_question || "";
                const mentionsChart = /chart would help|attach.*chart|a chart would/i.test(fq);
                return (
                  <div className="flex flex-wrap items-center gap-2 mt-3 ml-3">
                    <button
                      onClick={() => setTimeout(() => taRef.current?.focus(), 0)}
                      className="h-9 px-4 rounded-md bg-teal text-white text-[14px] font-medium hover:opacity-90"
                    >
                      Yes — add context
                    </button>
                    <button
                      onClick={() => void sendMessage("skip")}
                      className="h-9 px-4 rounded-md border border-[#ECEAE4] text-teal text-[14px] font-medium hover:bg-teal-soft"
                    >
                      Skip — evaluate now
                    </button>
                    {mentionsChart && (
                      <button
                        onClick={onPickFile}
                        className="h-9 px-4 rounded-md border border-[#ECEAE4] text-teal text-[14px] font-medium hover:bg-teal-soft"
                      >
                        Attach chart
                      </button>
                    )}
                  </div>
                );
              })()}
              {loading && (
                <div className="flex flex-col items-start gap-1.5 mt-3">
                  <div className="text-[11px] text-ink-secondary flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-teal inline-block" /> Tenet
                  </div>
                  <div
                    className="bg-surface border border-[#ECEAE4] rounded-lg p-4 w-[80%] tenet-thinking-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 text-teal animate-spin" />
                        <span className="ml-2 text-[14px] text-ink">Thinking…</span>
                      </div>
                      <span className="text-[13px] font-mono text-ink-secondary">{aiElapsed}s</span>
                    </div>
                    <div className="mt-3 w-full h-1 rounded-full bg-[#ECEAE4] overflow-hidden">
                      <div
                        className="h-1 rounded-full bg-teal"
                        style={{ width: `${aiProgress}%`, transition: "width 100ms linear" }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {isHistory && historyEntry && (
                <div className="flex justify-start">
                  <button
                    onClick={() => navigate({ to: "/verdict", search: { id: historyEntry.id } as never })}
                    className="px-3 py-1.5 border border-[#ECEAE4] text-ink-secondary rounded-md text-[13px] hover:bg-[#F5F5F0]"
                  >
                    Open full verdict →
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-border bg-surface px-6 py-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={(e) => onFiles(e.target.files)}
            />
            <div className="max-w-[720px] mx-auto flex items-end gap-3">
              <button
                onClick={onPickFile}
                disabled={isHistory}
                title="Attach chart image"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#888] hover:text-teal hover:bg-teal-soft transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#888]"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                <textarea
                  ref={taRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={micState === "recording" || isHistory}
                  readOnly={isHistory}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={
                    isHistory
                      ? "This is a saved trade. Click 'Start new trade' to begin a new check."
                      : micState === "recording"
                        ? "Listening..."
                        : transcribing
                          ? ""
                          : "Type your trade plan here..."
                  }
                  className="w-full resize-none px-3 py-2.5 pr-9 text-[14px] rounded-md border border-border bg-surface focus:outline-none focus:border-teal max-h-[120px] disabled:opacity-60"
                />
                {transcribing && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-ink-secondary">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Transcribing...</span>
                  </div>
                )}
              </div>
              <MicButton state={micState} onClick={toggleMic} disabled={transcribing || loading || isHistory} />
              <button
                onClick={onSendClick}
                disabled={!canSend}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                  canSend
                    ? "bg-teal text-white hover:opacity-90"
                    : "bg-[#E8E8E0] text-ink-secondary cursor-not-allowed"
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
            {retryAvailable && (
              <div className="max-w-[720px] mx-auto mt-3 flex justify-end">
                <button
                  onClick={() => void sendMessage()}
                  disabled={loading || !input.trim()}
                  className="px-3 py-1.5 text-[14px] border border-teal text-teal rounded-md hover:bg-teal-soft disabled:opacity-50"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Plan 40% */}
        <div className="flex flex-col" style={{ flexBasis: "40%", maxWidth: 480 }}>
          <div className="px-5 h-12 flex flex-col justify-center border-b border-border">
            <div className="text-[13px] font-medium">Your trade plan</div>
            <div className="text-[11px] italic text-ink-secondary">Filling as we talk.</div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {attachedImages.length > 0 && (
              <div className="mb-6">
                <div className="text-[12px] uppercase tracking-[0.12em] text-teal font-medium">
                  Supporting documents
                </div>
                <div className="text-[11px] italic text-ink-secondary mt-0.5">
                  Charts attached to this evaluation
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {attachedImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        onClick={() => setLightbox(img)}
                        className="rounded-md border border-[#ECEAE4] cursor-zoom-in object-cover"
                        style={{ width: 60, height: 40 }}
                      />
                      <button
                        onClick={() => removeImage(img)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-ink text-white flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                      <div
                        className="text-[10px] text-ink-secondary truncate mt-0.5"
                        style={{ maxWidth: 60 }}
                      >
                        {img.name}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border mt-5" />
              </div>
            )}
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
            <p
              className={`mt-2 text-[12px] italic text-center ${isFinal ? "text-teal" : "text-ink-secondary"}`}
            >
              {isFinal
                ? "Ready when you are."
                : "Tenet has open questions — answer above for the most useful verdict."}
            </p>
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-zoom-out"
        >
          <img
            src={lightbox.dataUrl}
            alt={lightbox.name}
            className="max-w-full max-h-full rounded-md"
          />
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="bg-background rounded-lg max-w-md w-full p-6 border border-border">
            <div className="text-[15px] font-medium mb-2">Remove referenced image?</div>
            <div className="text-[13px] text-ink-secondary mb-5">
              This image is referenced in Tenet's prior reasoning. Remove anyway?
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="px-4 py-2 text-[13px] rounded-md border border-border hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  doRemoveImage(confirmRemove);
                  setConfirmRemove(null);
                }}
                className="px-4 py-2 text-[13px] rounded-md bg-ink text-white hover:opacity-90"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MicButton({
  state,
  onClick,
  disabled,
}: {
  state: "idle" | "recording" | "stopped";
  onClick: () => void;
  disabled?: boolean;
}) {
  const tip =
    state === "idle"
      ? "Tap to speak"
      : state === "recording"
        ? "Listening — tap again to stop"
        : "";
  return (
    <div className="relative group shrink-0">
      {state === "recording" && (
        <span
          className="absolute inset-0 rounded-full bg-red-500 opacity-0 animate-tenet-pulse"
          style={{ margin: -8 }}
        />
      )}
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
          state === "recording"
            ? "bg-red-600 text-white"
            : state === "stopped"
              ? "bg-white border-[1.5px] border-emerald-500 text-emerald-500"
              : "bg-white border-[1.5px] border-teal text-teal hover:bg-teal-soft"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {state === "stopped" ? <Check className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {state === "recording" && (
          <span className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        )}
      </button>
      {tip && (
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-ink text-white text-[12px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {tip}
        </div>
      )}
    </div>
  );
}

function TextBubble({
  entry,
  img,
  onImg,
}: {
  entry: Extract<ChatEntry, { kind: "text" }>;
  img?: AttachedImage;
  onImg: (i: AttachedImage) => void;
}) {
  if (entry.role === "assistant") {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <div className="text-[11px] text-ink-secondary flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-teal inline-block" /> Tenet
        </div>
        <div className="bg-teal-soft border-l-2 border-teal rounded-md px-3 py-2.5 max-w-[70%] text-[14px] text-ink whitespace-pre-wrap">
          {img && (
            <img
              src={img.dataUrl}
              alt={img.name}
              onClick={() => onImg(img)}
              className="mb-2 rounded-md border border-[#ECEAE4] cursor-zoom-in object-cover"
              style={{ width: 120, height: 80 }}
            />
          )}
          {entry.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="text-[11px] text-ink-secondary">You</div>
      <div className="bg-[#F1F4F8] rounded-md px-3 py-2.5 max-w-[70%] text-[14px] text-ink whitespace-pre-wrap">
        {entry.content}
      </div>
    </div>
  );
}

function PlanPanel({ ep }: { ep: import("@/lib/tenet/types").ExtractedPlan | null }) {
  if (!ep) {
    return (
      <div className="h-full flex items-center justify-center text-center text-[13px] italic text-ink-secondary px-6">
        Your trade plan will appear here as you tell me.
      </div>
    );
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
    return (
      <div className="h-full flex items-center justify-center text-center text-[13px] italic text-ink-secondary px-6">
        Your trade plan will appear here as you tell me.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3.5">
      {visible.map((r) => (
        <div key={r.label}>
          <div className="flex items-center gap-2">
            <div className="text-[11px] uppercase tracking-[0.12em] text-ink-secondary">
              {r.label}
            </div>
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
