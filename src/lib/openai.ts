import "server-only";

type Effort = "minimal" | "low" | "medium" | "high";

export type ChatJSONResult<T> =
  | { ok: true; data: T; raw: string; latencyMs: number; model: string }
  | { ok: false; error: "timeout" | "empty" | "bad_json" | "upstream" | "config"; message: string };

function isTimeout(e: unknown) {
  const name = e instanceof Error ? e.name : "";
  const msg = e instanceof Error ? e.message : String(e);
  return name === "TimeoutError" || name === "AbortError" || /timeout|timed out|aborted/i.test(msg);
}

/** Chat Completions in JSON mode. Mirrors the v1 call (gpt-5, low effort, 59 s budget). */
export async function chatJSON<T>(opts: {
  system: string;
  user: string;
  images?: string[]; // URLs or data URLs
  model?: string;
  effort?: Effort;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<ChatJSONResult<T>> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "config", message: "OPENAI_API_KEY is not configured." };
  const model = opts.model ?? "gpt-5";
  const content = opts.images?.length
    ? [{ type: "text", text: opts.user }, ...opts.images.map((url) => ({ type: "image_url", image_url: { url } }))]
    : opts.user;

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: opts.maxTokens ?? 4000,
        reasoning_effort: opts.effort ?? "low",
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 59_000),
    });
  } catch (e) {
    if (isTimeout(e)) return { ok: false, error: "timeout", message: "Tenet is taking unusually long. Please try again." };
    return { ok: false, error: "upstream", message: "Could not reach the model. Please try again." };
  }

  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 408 || res.status === 504 || /timeout|timed out/i.test(txt)) {
      return { ok: false, error: "timeout", message: "Tenet is taking unusually long. Please try again." };
    }
    console.error("[openai]", res.status, txt.slice(0, 500));
    return { ok: false, error: "upstream", message: `The model returned an error (${res.status}). Please try again.` };
  }

  const j = await res.json();
  const choice = j?.choices?.[0];
  const raw: string = choice?.message?.content ?? "";
  console.log("[openai]", model, "finish:", choice?.finish_reason, "usage:", JSON.stringify(j?.usage), "ms:", Date.now() - started);
  if (!raw) {
    return {
      ok: false,
      error: "empty",
      message: choice?.finish_reason === "length" ? "The response was cut off. Please try a shorter input." : "The model returned an empty response. Please try again.",
    };
  }
  try {
    return { ok: true, data: JSON.parse(raw) as T, raw, latencyMs: Date.now() - started, model };
  } catch {
    return { ok: false, error: "bad_json", message: "The model returned an unreadable response. Please try again." };
  }
}
