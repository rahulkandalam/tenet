import { createServerFn } from "@tanstack/react-start";
import { SYSTEM_PROMPT } from "./prompt";

type Input = {
  rulebook: unknown;
  history: { role: "user" | "assistant"; content: string }[];
  latest: string;
};

export const evaluateTrade = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => d)
  .handler(async ({ data }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured");

    const historyText = data.history
      .map((m) => `  ${m.role === "user" ? "Trader" : "Tenet"}: "${m.content.replace(/"/g, '\\"')}"`)
      .join("\n");

    const userMsg = `<RULEBOOK>
${JSON.stringify(data.rulebook, null, 2)}
</RULEBOOK>

<CONVERSATION_HISTORY>
${historyText}
</CONVERSATION_HISTORY>

<LATEST_INPUT>
${data.latest}
</LATEST_INPUT>`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 6000,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenAI ${res.status}: ${txt.slice(0, 300)}`);
    }
    const j = await res.json();
    const content: string = j?.choices?.[0]?.message?.content ?? "";
    return { content };
  });
