# Tenet

Pre-trade discipline for traders: describe a trade idea, and Tenet checks it against **your own rulebook only**, returning GO AHEAD, PROCEED WITH CAUTION, NO GO, or a follow-up question when the plan is incomplete. It is a thesis checker, not an execution tool.

## Stack

Next.js (App Router) · shadcn/ui + Tailwind v4 with the Onyx tokens · Supabase (auth, Postgres, storage) · OpenAI · Vercel.

## Local development

```bash
cp .env.example .env.local   # fill in the four values
npm install
npm run dev
```

## Environment variables

| Name | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | safe to expose; RLS protects data |
| `SUPABASE_SECRET_KEY` | server only | bypasses RLS |
| `OPENAI_API_KEY` | server only | evaluation + transcription |

## Branches

- `main` – v1 (Lovable export) until cutover
- `v2` – this rebuild
- tag `v1-lovable` – frozen v1 baseline
