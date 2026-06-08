import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/tenet/Sidebar";
import { RulebookForm } from "@/components/tenet/RulebookForm";

export const Route = createFileRoute("/rulebook/")({
  head: () => ({ meta: [{ title: "Edit rulebook — Tenet" }] }),
  component: () => (
    <AppShell>
      <RulebookForm mode="edit" />
    </AppShell>
  ),
});
