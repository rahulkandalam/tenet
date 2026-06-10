import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/tenet/Sidebar";
import {
  AUTHED_KEY,
  CURRENT_USER_KEY,
  DAILY_LIMIT,
  getCurrentUser,
  getEvalCount,
} from "@/lib/tenet/types";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Tenet" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (u) setCount(getEvalCount(u));
  }, []);

  const switchUser = () => {
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch {
      // ignore
    }
    navigate({ to: "/identity" });
  };

  const signOut = () => {
    try {
      localStorage.removeItem(AUTHED_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch {
      // ignore
    }
    navigate({ to: "/unlock" });
  };

  return (
    <AppShell>
      <div className="max-w-[720px] mx-auto px-8 py-10">
        <h1 className="text-[28px] font-semibold tracking-tight">Settings</h1>
        <div className="mt-6 bg-surface border border-border rounded-lg p-6">
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal">
            Account
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-[14px] text-ink-secondary">Display name</div>
            <div className="text-[14px] text-ink">{user ?? "—"}</div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-[14px] text-ink-secondary">Today's evaluations</div>
            <div className="text-[14px] text-ink">
              {count} of {DAILY_LIMIT} used
            </div>
          </div>
          <div className="mt-4 border-t border-border" />
          <button
            onClick={switchUser}
            className="mt-4 block text-[14px] text-teal hover:opacity-80"
          >
            Switch user
          </button>
          <button
            onClick={signOut}
            className="mt-3 block text-[14px] text-[#DC2626] hover:opacity-80"
          >
            Sign out
          </button>
        </div>
      </div>
    </AppShell>
  );
}
