import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/tenet/Sidebar";
import { RulebookForm } from "@/components/tenet/RulebookForm";
import { getCurrentUser, loadRulebook, rulebookKeyFor, type Rulebook } from "@/lib/tenet/types";

export const Route = createFileRoute("/rulebook/")({
  head: () => ({ meta: [{ title: "Edit rulebook — Tenet" }] }),
  component: RulebookView,
});

function RulebookView() {
  const [rb, setRb] = useState<Rulebook | null>(null);
  const [text, setText] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const loaded = loadRulebook();
    setRb(loaded);
    if (loaded && loaded.format === "free_text") {
      setText(loaded.text ?? "");
    }
    setHydrated(true);
  }, []);

  if (!hydrated) return <AppShell><div /></AppShell>;

  if (rb && rb.format === "free_text") {
    return (
      <AppShell>
        <div className="max-w-[880px] mx-auto px-8 pt-8 pb-16">
          <div className="text-[13px] text-ink-secondary">
            Rulebook <span className="mx-1">›</span> Uploaded
          </div>
          <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Your rulebook</h1>
          <p className="mt-2 text-[14px] italic text-ink-secondary">
            Loaded from {rb.source_filename ?? "uploaded file"} — Tenet will use this text as-is for every evaluation.
          </p>
          <div
            className="mt-6 bg-surface border border-[#ECEAE4] rounded-lg p-6 overflow-auto"
            style={{ maxHeight: "60vh" }}
          >
            <pre className="font-mono text-[14px] leading-[1.6] whitespace-pre-wrap text-ink">{rb.text}</pre>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/home" })}
              className="px-5 py-2.5 bg-teal text-white text-[14px] font-medium rounded-md hover:opacity-90"
            >
              Evaluate my trade idea
            </button>
            <button
              onClick={() => {
                if (confirm("Replace the current uploaded rulebook?")) {
                  navigate({ to: "/rulebook/new" });
                }
              }}
              className="px-4 py-2 text-[14px] text-ink-secondary border border-border rounded-md hover:bg-[#F5F5F0]"
            >
              Replace rulebook
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RulebookForm mode="edit" />
    </AppShell>
  );
}
