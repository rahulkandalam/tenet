import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/tenet/Sidebar";
import { RulebookForm } from "@/components/tenet/RulebookForm";
import { RulebookUpload } from "@/components/tenet/RulebookUpload";

export const Route = createFileRoute("/rulebook/new")({
  head: () => ({ meta: [{ title: "New rulebook — Tenet" }] }),
  component: () => (
    <AppShell>
      <div className="max-w-[880px] mx-auto px-8 pt-8">
        <div className="text-[13px] text-ink-secondary">
          Rulebook <span className="mx-1">›</span> New rulebook
        </div>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight">Set up your rulebook</h1>
        <p className="mt-2 text-[14px] italic text-ink-secondary">
          Capture your strategy and the rules you trade by. Required sections are marked with *.
        </p>
      </div>
      <RulebookUpload />
      <RulebookForm mode="new" />
    </AppShell>
  ),
});
