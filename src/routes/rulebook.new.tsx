import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/tenet/Sidebar";
import { RulebookForm } from "@/components/tenet/RulebookForm";
import { RulebookUpload } from "@/components/tenet/RulebookUpload";

export const Route = createFileRoute("/rulebook/new")({
  head: () => ({ meta: [{ title: "New rulebook — Tenet" }] }),
  component: () => (
    <AppShell>
      <RulebookUpload />
      <RulebookForm mode="new" />
    </AppShell>
  ),
});
