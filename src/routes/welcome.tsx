import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — Tenet" }] }),
  component: Welcome,
});

function Welcome() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-16">
      <div className="max-w-[720px] w-full text-center">
        <div className="text-[11px] uppercase tracking-[0.18em] text-ink-secondary mb-6">
          Welcome to Tenet
        </div>
        <h1 className="text-[40px] font-semibold tracking-tight text-ink leading-tight">
          Let's start with your rules.
        </h1>
        <p className="mt-5 text-[16px] text-ink-secondary leading-relaxed max-w-[560px] mx-auto">
          Before you can check a trade against your discipline, we need to capture
          the rules you trade by. Set them up once — you can edit anytime.
        </p>

        <div className="mt-10 flex justify-center">
          <Link
            to="/rulebook/new"
            className="block w-[440px] max-w-full text-left bg-surface border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md bg-teal-soft text-teal flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[16px] font-semibold text-ink">Set up my rulebook</div>
                <div className="mt-1 text-[13px] text-ink-secondary">
                  Capture your strategy and the rules you trade by. About 5 minutes.
                </div>
              </div>
            </div>
          </Link>
        </div>

        <p className="mt-10 text-[12px] italic text-ink-secondary">
          Either way, you're in control. Edit anything anytime.
        </p>
      </div>
    </div>
  );
}
