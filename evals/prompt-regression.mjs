// Prompt regression set. Run: set -a; . ./.env.local; set +a; NODE_USE_ENV_PROXY=1 node evals/prompt-regression.mjs
// Each case runs twice; every line should say PASS before a prompt change ships.
import fs from "node:fs";
const src = fs.readFileSync(new URL("../src/lib/tenet/prompt.ts", import.meta.url), "utf8");
const SYSTEM = eval("`" + src.slice(src.indexOf("`") + 1, src.lastIndexOf("`")) + "`");
const SMC = { qualifying_criteria: ["R1: Markets are in uptrend or downtrend"], entry_rules: ["R2: Price reaching open order block (demand or supply)"],
  exit_rules: ["R3: Stop below or above the order block depending on uptrend or downtrend", "R4: Target is 2R"], risk_management: ["R5: 1% per trade"], soft_meta_rules: [] };
const V1 = { qualifying_criteria: ["R1: Only trade with the daily bias"], entry_rules: ["R2: Entries from a 4H OB or FVG, nothing else"], exit_rules: ["R3: Minimum 3R or I don't take it"],
  risk_management: ["R4: Half a percent risk max per trade", "R5: No entry within 30 minutes of red-folder news"], soft_meta_rules: ["R6: Two trades a day at most"] };
const CASES = [
  ["SMC: short in uptrend at demand, incomplete → NO GO", SMC, "EUR USD is clearly in uptrend on 4H timeframe. Price are about to enter the order block (demand zone). Planning to take a short position", ["NO GO"]],
  ["long, incomplete → PROMPT", SMC, "EURUSD in a clear 4H uptrend, price about to tap the 4H demand order block. Planning a long.", ["PROMPT"]],
  ["long, complete, OB touch not confirmed → CAUTION (trigger rule)", SMC, "EURUSD 4H uptrend. Long from the demand OB at 1.0850, stop 1.0835 below the block, target 1.0880 (2R). Risking 1%.", ["PROCEED WITH CAUTION"]],
  ["short at supply, complete, touch not confirmed → CAUTION", SMC, "GBPUSD 4H downtrend. Short from the supply OB at 1.2710, stop 1.2725 above the block, target 1.2680 which is 2R. 1% risk.", ["PROCEED WITH CAUTION"]],
  ["v1 rulebook, no stop → PROMPT", V1, "EURUSD short from the 4H bearish order block at 1.0875-1.0890. Daily bias is bearish after the break of 1.0820. Entry 1.0882, target 1.0790.", ["PROMPT"]],
  ["v1 rulebook, 2R vs 3R rule → NO GO", V1, "EURUSD short, daily bias bearish, entry 1.0882 from the 4H OB, stop 1.0912, target 1.0822 (2R). 0.5% risk, calendar clear, first trade today.", ["NO GO"]],
];
const run = async ([name, rb, msg, want]) => {
  const user = `<RULEBOOK>\nRULEBOOK (structured):\n${JSON.stringify(rb, null, 2)}\n\n</RULEBOOK>\n\n<CONVERSATION_HISTORY>\n\n</CONVERSATION_HISTORY>\n\n<LATEST_INPUT>\n${msg}\n</LATEST_INPUT>`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-5", messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }], response_format: { type: "json_object" }, max_completion_tokens: 4000, reasoning_effort: "low" }) });
  const o = JSON.parse((await r.json()).choices[0].message.content);
  return `${want.includes(o.verdict_word) ? "PASS" : "FAIL"}  ${name.padEnd(62)} got ${o.verdict_word}${want.includes(o.verdict_word) ? "" : " — " + o.summary}`;
};
const out = await Promise.all([...CASES, ...CASES].map(run));
console.log(out.join("\n"));
