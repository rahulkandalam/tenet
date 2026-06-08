import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/tenet/Sidebar";
import { loadRulebook, type Rulebook } from "@/lib/tenet/types";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Home — Tenet" }] }),
  component: HomePage,
});

function HomePage() {
  const [rb, setRb] = useState<Rulebook | null>(null);
  const navigate = useNavigate();
  useEffect(() => { setRb(loadRulebook()); }, []);

  if (!rb) return <AppShell><div /></AppShell>;

  const total = rb.qualifying_criteria.length + rb.entry_rules.length + rb.exit_rules.length + rb.risk_management.length + rb.soft_meta_rules.length;
  const date = rb.activated_at ? new Date(rb.activated_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

  const cards = [
    { title: "Strategy name", content: <div className="text-[14px] text-ink">{rb.strategy_name}</div> },
    { title: "Qualifying criteria", content: <RuleList items={rb.qualifying_criteria} /> },
    { title: "Entry rules", content: <RuleList items={rb.entry_rules} /> },
    { title: "Exit rules", content: <RuleList items={rb.exit_rules} /> },
    { title: "Risk / safety", content: <RuleList items={rb.risk_management} /> },
    { title: "Soft meta-rules", content: <RuleList items={rb.soft_meta_rules} /> },
  ];

  return (
    <AppShell>
      <div className="max-w-[1080px] mx-auto px-8 py-10">
        <h1 className="text-[28px] font-semibold tracking-tight">Home</h1>
        <p className="mt-2 text-[14px] text-ink-secondary">
          Your active rulebook · {rb.strategy_name} · {total} rules{date && <> · activated {date}</>}
        </p>

        <div className="my-7 border-t border-border" />

        <div className="text-[12px] uppercase tracking-[0.14em] text-ink-secondary mb-3">Your rulebook</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((c) => (
            <div key={c.title} className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal">{c.title}</div>
                <Link to="/rulebook" className="text-[12px] text-ink-secondary hover:text-teal">Edit ▸</Link>
              </div>
              <div className="mt-3">{c.content}</div>
            </div>
          ))}
        </div>

        <div className="my-8 border-t border-border" />

        <div className="flex flex-col items-center text-center">
          <button
            onClick={() => navigate({ to: "/evaluate" })}
            className="px-7 py-3 bg-teal text-white text-[16px] font-medium rounded-md hover:opacity-90"
          >
            Evaluate my idea →
          </button>
          <p className="mt-3 text-[12px] italic text-ink-secondary max-w-[480px]">
            Speak your trade plan — entry, exit, size, why. I'll check it against your own rules in seconds.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function RuleList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <div className="text-[13px] italic text-ink-secondary">None set</div>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="text-[14px] text-ink flex gap-2">
          <span className="text-ink-secondary">•</span><span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
