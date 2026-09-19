# Legacy v1 reference

Files copied verbatim from the Lovable build (tag `v1-lovable`) so the AI layer can be ported without drift.
They are excluded from the TypeScript build and lint. The full v1 app lives at the `v1-lovable` tag and on `main` until cutover.

- `v1-lib/prompt.ts` – the system prompt (the product's brain). Port verbatim.
- `v1-lib/evaluate.functions.ts` – `evaluateTrade` and `transcribeAudio` server functions.
- `v1-lib/types.ts` – data types and the localStorage helpers being replaced by Supabase.
