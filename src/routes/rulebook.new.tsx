import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/tenet/Sidebar";
import { RulebookForm } from "@/components/tenet/RulebookForm";

export const Route = createFileRoute("/rulebook/new")({
  head: () => ({ meta: [{ title: "New rulebook — Tenet" }] }),
  component: () => (
    <AppShell>
      <RulebookForm mode="new" />
    </AppShell>
  ),
});
