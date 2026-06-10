import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AUTHED_KEY,
  CURRENT_USER_KEY,
  isAuthed,
  getCurrentUser,
} from "@/lib/tenet/types";

export const Route = createFileRoute("/unlock")({
  head: () => ({ meta: [{ title: "Unlock — Tenet" }] }),
  component: UnlockPage,
});

const PASSPHRASE = "tenetmode";

function UnlockPage() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthed() && getCurrentUser()) {
      navigate({ to: "/home", replace: true });
    } else if (isAuthed()) {
      navigate({ to: "/identity", replace: true });
    }
    inputRef.current?.focus();
  }, [navigate]);

  const submit = () => {
    const v = value.trim().toLowerCase();
    if (v === PASSPHRASE) {
      try {
        localStorage.setItem(AUTHED_KEY, "true");
      } catch {
        // ignore
      }
      if (getCurrentUser()) navigate({ to: "/home" });
      else navigate({ to: "/identity" });
    } else {
      setError(true);
      setValue("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-surface border border-border rounded-lg p-8">
        <div className="text-center text-[24px] font-semibold tracking-tight">
          <span className="inline-flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-teal inline-block" />
            Tenet
          </span>
        </div>
        <h1 className="mt-3 text-center text-[24px] font-semibold text-ink">Welcome</h1>
        <p className="mt-3 text-center text-[14px] text-ink-secondary">
          Enter the passphrase to access this preview.
        </p>
        <div className="mt-6">
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="passphrase"
            className="w-full px-2 py-2 text-[14px] rounded-md border border-border bg-surface focus:outline-none focus:border-teal"
            style={{ padding: 8 }}
          />
          {error && (
            <div className="mt-2 text-[12px] text-[#DC2626]">
              Incorrect passphrase. Try again.
            </div>
          )}
        </div>
        <button
          onClick={submit}
          className="mt-4 w-full bg-teal text-white text-[14px] font-medium rounded-md hover:opacity-90"
          style={{ padding: "12px 24px" }}
        >
          Unlock
        </button>
      </div>
    </div>
  );
}
