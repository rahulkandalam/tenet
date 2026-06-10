import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/welcome-tenet")({
  head: () => ({ meta: [{ title: "Welcome to Tenet" }] }),
  component: WelcomeTenetPage,
});

function WelcomeTenetPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[480px] bg-surface border border-border rounded-lg p-8 text-center">
        <h1 className="text-[28px] font-semibold text-ink">Welcome to Tenet.</h1>
        <p className="mt-4 text-[16px] text-ink">
          Tenet helps you check every trade against your own rulebook before you take it.
        </p>
        <p className="mt-3 text-[16px] text-ink">
          Type or speak your trade plan. Attach a chart if you have one. Tenet evaluates and gives
          you a verdict: GO AHEAD, PROCEED WITH CAUTION, or NO GO.
        </p>
        <p className="mt-3 text-[16px] text-ink">Let's start by setting up your rulebook.</p>
        <button
          onClick={() => navigate({ to: "/rulebook/new" })}
          className="mt-6 bg-teal text-white text-[14px] font-medium rounded-md hover:opacity-90"
          style={{ padding: "12px 24px" }}
        >
          Set up rulebook
        </button>
      </div>
    </div>
  );
}
