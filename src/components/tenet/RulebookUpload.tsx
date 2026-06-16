import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { getCurrentUser, rulebookKeyFor, type Rulebook } from "@/lib/tenet/types";

const MAX_BYTES = 1024 * 1024;
const MAX_CHARS = 50_000;

function normalize(text: string): { text: string; truncated: boolean } {
  let t = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  let truncated = false;
  if (t.length > MAX_CHARS) {
    t = t.slice(0, MAX_CHARS);
    truncated = true;
  }
  return { text: t, truncated };
}

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return await file.text();
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const buf = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return res.value || "";
  }
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    try {
      (pdfjs as { GlobalWorkerOptions?: { workerSrc: string } }).GlobalWorkerOptions!.workerSrc = "";
    } catch {
      // ignore
    }
    const buf = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: buf, disableWorker: true } as never);
    const pdf = await loadingTask.promise;
    let out = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n\n";
    }
    return out;
  }
  throw new Error("Unsupported file type");
}

export function RulebookUpload() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("File too large — max 1MB");
      return;
    }
    const lname = file.name.toLowerCase();
    if (!/\.(txt|md|docx|pdf)$/.test(lname)) {
      toast.error("Unsupported file type. Use .txt, .md, .docx, or .pdf");
      return;
    }
    const user = getCurrentUser();
    if (!user) {
      toast.error("No active user. Please sign in again.");
      return;
    }
    setBusy(true);
    try {
      const raw = await extractText(file);
      const { text, truncated } = normalize(raw);
      if (!text) {
        toast.error("No readable text found in file");
        return;
      }
      const rb: Rulebook = {
        format: "free_text",
        strategy_name: file.name,
        qualifying_criteria: [],
        entry_rules: [],
        exit_rules: [],
        risk_management: [],
        soft_meta_rules: [],
        text,
        source_filename: file.name,
        uploaded_at: new Date().toISOString(),
        activated_at: new Date().toISOString(),
      };
      localStorage.setItem(rulebookKeyFor(user), JSON.stringify(rb));
      if (truncated) toast.message(`Trimmed to first ${MAX_CHARS.toLocaleString()} characters.`);
      toast.success(`Rulebook uploaded — ${file.name}`, { duration: 3000 });
      setTimeout(() => navigate({ to: "/rulebook" }), 400);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to read file";
      toast.error(`Couldn't read file: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[880px] mx-auto px-8 mt-10">
      <div className="bg-surface border border-border rounded-lg p-6">
        <h3 className="text-[18px] font-semibold">Upload your rulebook</h3>
        <p className="mt-1 text-[14px] text-ink-secondary">
          Have a rulebook already written elsewhere? Upload it as a file and Tenet will use it as-is for evaluations.
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          onClick={() => fileRef.current?.click()}
          className={`mt-4 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${dragOver ? "border-teal bg-teal-soft" : "border-[#ECEAE4] hover:bg-[#FAFAF7]"}`}
          style={{ borderStyle: "dashed", borderWidth: 1 }}
        >
          {busy ? (
            <Loader2 className="w-6 h-6 text-teal animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-ink-secondary" />
          )}
          <div className="mt-3 text-[14px] text-ink">
            {busy ? "Reading file…" : "Drop file or click to choose"}
          </div>
          <div className="mt-1 text-[12px] text-ink-secondary">.txt, .md, .docx, .pdf · max 1MB</div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.docx,.pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      </div>
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-border" />
        <div className="text-[12px] uppercase tracking-[0.18em] text-ink-secondary">OR</div>
        <div className="flex-1 h-px bg-border" />
      </div>
    </div>
  );
}
