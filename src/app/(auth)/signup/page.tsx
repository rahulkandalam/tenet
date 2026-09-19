"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const pwOk = password.length >= 8;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pwOk) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/rulebook/new`,
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <span className="flex size-[52px] items-center justify-center rounded-lg bg-brand/10 text-brand-soft ring-1 ring-inset ring-brand/30">
          <MailCheck className="size-6" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[28px] font-semibold tracking-[-0.03em]">Verify your email</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            We sent a confirmation link to <span className="text-ink">{email}</span>. Open it to activate your account.
          </p>
        </div>
        <Button variant="ghost" className="self-start px-0" onClick={() => setSent(false)}>Change email</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] font-semibold tracking-[-0.03em]">Create account</h2>
        <p className="text-sm text-ink-soft">Set up takes about two minutes, rulebook included.</p>
      </div>
      <Label>
        Name
        <Input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </Label>
      <Label>
        Email
        <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </Label>
      <Label>
        Password
        <Input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <span className={pwOk ? "text-win" : "text-ink-muted"}>
          {password.length === 0 ? "At least 8 characters." : pwOk ? "Looks good." : `${8 - password.length} more characters.`}
        </span>
      </Label>
      {error && <p role="alert" className="text-[13px] text-loss">{error}</p>}
      <Button type="submit" size="lg" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
      <p className="text-center text-[13px] text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-soft hover:text-ink">Log in</Link>
      </p>
      <p className="text-xs leading-relaxed text-ink-muted">Tenet is a discipline tool, not financial advice.</p>
    </form>
  );
}
