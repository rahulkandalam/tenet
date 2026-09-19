import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeQuota } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: "No audio received." }, { status: 400 });
  if (audio.size > 10 * 1024 * 1024) return NextResponse.json({ error: "That recording is too long." }, { status: 413 });

  const quota = await consumeQuota(supabase, "transcribe");
  if (!quota.ok) return NextResponse.json({ error: "Voice input limit reached for today." }, { status: 429 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "Transcription is not configured." }, { status: 500 });

  const ext = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";
  const fd = new FormData();
  fd.append("file", audio, `recording.${ext}`);
  fd.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
    signal: AbortSignal.timeout(50_000),
  }).catch(() => null);
  if (!res || !res.ok) return NextResponse.json({ error: "Could not transcribe that. Please try again or type it." }, { status: 502 });
  const j = await res.json();
  return NextResponse.json({ text: (j?.text as string) ?? "" });
}
