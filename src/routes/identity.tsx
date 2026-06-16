import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CURRENT_USER_KEY,
  KNOWN_USERS_KEY,
  LEGACY_RULEBOOK_KEY,
  rulebookKeyFor,
  loadRulebookFor,
  isRulebookComplete,
  isAuthed,
} from "@/lib/tenet/types";

export const Route = createFileRoute("/identity")({
  head: () => ({ meta: [{ title: "Identity — Tenet" }] }),
  component: IdentityPage,
});

const NAME_RE = /^[A-Za-z0-9 \-]+$/;

function IdentityPage() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [navigate]);


  const submit = () => {
    const name = value.trim();
    if (!name) {
      setError("Enter a display name.");
      return;
    }
    if (name.length > 30) {
      setError("Max 30 characters.");
      return;
    }
    if (!NAME_RE.test(name)) {
      setError("Use letters, numbers, spaces, or hyphens only.");
      return;
    }
    try {
      localStorage.setItem(CURRENT_USER_KEY, name);
      // known users
      let known: string[] = [];
      try {
        const raw = localStorage.getItem(KNOWN_USERS_KEY);
        if (raw) known = JSON.parse(raw);
        if (!Array.isArray(known)) known = [];
      } catch {
        known = [];
      }
      if (!known.includes(name)) {
        known.push(name);
        localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify(known));
      }
      // migration: copy legacy rulebook to namespaced if user has none
      const existing = loadRulebookFor(name);
      if (!existing) {
        try {
          const legacy = localStorage.getItem(LEGACY_RULEBOOK_KEY);
          if (legacy) localStorage.setItem(rulebookKeyFor(name), legacy);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    const rb = loadRulebookFor(name);
    if (isRulebookComplete(rb)) navigate({ to: "/home" });
    else navigate({ to: "/welcome-tenet" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-surface border border-border rounded-lg p-8">
        <h1 className="text-center text-[24px] font-semibold text-ink">Who's checking in?</h1>
        <p className="mt-3 text-center text-[14px] text-ink-secondary">
          Pick a display name. Your rulebook and eval history stay under this name on this device.
        </p>
        <div className="mt-6">
          <input
            ref={inputRef}
            type="text"
            maxLength={30}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="e.g., Rahul"
            className="w-full px-2 py-2 text-[14px] rounded-md border border-border bg-surface focus:outline-none focus:border-teal"
            style={{ padding: 8 }}
          />
          {error && <div className="mt-2 text-[12px] text-[#DC2626]">{error}</div>}
        </div>
        <button
          onClick={submit}
          className="mt-4 w-full bg-teal text-white text-[14px] font-medium rounded-md hover:opacity-90"
          style={{ padding: "12px 24px" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
