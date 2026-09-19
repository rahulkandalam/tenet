"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/check");
    router.refresh();
  }

  async function google() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/check` },
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] font-semibold tracking-[-0.03em]">Log in</h2>
        <p className="text-sm text-ink-soft">Welcome back. Your rulebook and journal are where you left them.</p>
      </div>
      <Label>
        Email
        <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </Label>
      <Label>
        Password
        <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Label>
      {error && <p role="alert" className="text-[13px] text-loss">{error}</p>}
      <Button type="submit" size="lg" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
      <div className="flex items-center gap-3 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" />
      </div>
      <Button type="button" variant="secondary" size="lg" onClick={google}>Continue with Google</Button>
      <p className="text-center text-[13px] text-ink-soft">
        New to Tenet?{" "}
        <Link href="/signup" className="text-brand-soft hover:text-ink">Create account</Link>
      </p>
    </form>
  );
}
