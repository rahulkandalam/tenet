import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 1024 * 1024;
const MAX_CHARS = 60_000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is over 1 MB." }, { status: 413 });

  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = buf.toString("utf8");
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    } else if (name.endsWith(".pdf")) {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      text = (await extractText(pdf, { mergePages: true })).text as string;
    } else {
      return NextResponse.json({ error: "Use a .txt, .md, .docx or .pdf file." }, { status: 415 });
    }
  } catch (e) {
    console.error("[extract]", e);
    return NextResponse.json({ error: "Could not read that file. Try saving it as .docx or .txt." }, { status: 422 });
  }

  text = text.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return NextResponse.json({ error: "No text found in that file. Scanned PDFs are not supported yet." }, { status: 422 });
  return NextResponse.json({ text: text.slice(0, MAX_CHARS), filename: file.name, truncated: text.length > MAX_CHARS });
}
