import { createServerFn } from "@tanstack/react-start";
import { SYSTEM_PROMPT } from "./prompt";

type ImagePart = { dataUrl: string };

type Input = {
  rulebook: unknown;
  history: { role: "user" | "assistant"; content: string }[];
  latest: string;
  images?: ImagePart[];
};

type EvaluationResult =
  | { content: string; error?: undefined; message?: undefined }
  | { content: ""; error: "timeout"; message: string };

function isTimeoutError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  return name === "TimeoutError" || name === "AbortError" || /timeout|timed out|aborted/i.test(message);
}

export const evaluateTrade = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => d)
  .handler(async ({ data }): Promise<EvaluationResult> => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured");

    const historyText = data.history
      .map((m) => `  ${m.role === "user" ? "Trader" : "Tenet"}: "${m.content.replace(/"/g, '\\"')}"`)
      .join("\n");

    const userText = `<RULEBOOK>
${JSON.stringify(data.rulebook, null, 2)}
</RULEBOOK>

<CONVERSATION_HISTORY>
${historyText}
</CONVERSATION_HISTORY>

<LATEST_INPUT>
${data.latest}
</LATEST_INPUT>`;

    const imgs = data.images ?? [];
    const userContent: unknown = imgs.length
      ? [
          { type: "text", text: userText },
          ...imgs.map((i) => ({ type: "image_url", image_url: { url: i.dataUrl } })),
        ]
      : userText;

    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 1800,
        }),
        signal: AbortSignal.timeout(59000),
      });
    } catch (error) {
      if (isTimeoutError(error)) {
        return {
          content: "",
          error: "timeout",
          message: "Tenet is taking unusually long. Please try again with a shorter trade note.",
        };
      }
      throw error;
    }

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 408 || res.status === 504 || /timeout|timed out|aborted/i.test(txt)) {
        return {
          content: "",
          error: "timeout",
          message: "Tenet is taking unusually long. Please try again with a shorter trade note.",
        };
      }
      throw new Error(`OpenAI ${res.status}: ${txt.slice(0, 300)}`);
    }
    const j = await res.json();
    const content: string = j?.choices?.[0]?.message?.content ?? "";
    return { content };
  });

type TranscribeInput = { audioBase64: string; mimeType: string };

export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((d: TranscribeInput) => d)
  .handler(async ({ data }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured");

    const bin = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    const ext = data.mimeType.includes("mp4") ? "mp4" : data.mimeType.includes("ogg") ? "ogg" : "webm";
    const blob = new Blob([bin], { type: data.mimeType });
    const form = new FormData();
    form.append("file", blob, `recording.${ext}`);
    form.append("model", "whisper-1");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Whisper ${res.status}: ${txt.slice(0, 300)}`);
    }
    const j = await res.json();
    return { text: (j?.text as string) ?? "" };
  });
