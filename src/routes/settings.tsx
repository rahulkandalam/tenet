import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/tenet/Sidebar";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Tenet" }] }),
  component: () => (
    <AppShell>
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[24px] font-semibold text-ink">Coming soon</h1>
        <p className="mt-2 text-[14px] text-ink-secondary">Settings will be available in a future update.</p>
      </div>
    </AppShell>
  ),
});
