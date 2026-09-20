"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Google OAuth via Supabase. Renders nothing (divider included) until the Google provider is
 * enabled in Supabase, so the button appears on its own once it has been set up.
 */
export function GoogleButton({ label }: { label: string }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && setEnabled(!!j?.external?.google))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function go() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/check`, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setBusy(false);
      setError(/provider is not enabled/i.test(error.message) ? "Google sign-in isn't switched on yet." : error.message);
    }
  }

  if (!enabled) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" />
      </div>
      <Button type="button" variant="secondary" size="lg" onClick={go} disabled={busy}>
        {busy ? "Opening Google…" : label}
      </Button>
      {error && <p role="alert" className="text-[13px] text-loss">{error}</p>}
    </div>
  );
}
