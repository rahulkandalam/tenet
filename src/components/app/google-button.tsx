"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/** Google OAuth via Supabase. New Google users land in rulebook setup; returning users land on Check. */
export function GoogleButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" size="lg" onClick={go} disabled={busy}>
        {busy ? "Opening Google…" : label}
      </Button>
      {error && <p role="alert" className="text-[13px] text-loss">{error}</p>}
    </div>
  );
}
