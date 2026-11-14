import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Serves a cached recap mp3 (data/recaps/<16 hex>.mp3) to the phone.
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const file = (await params).file;
  if (!/^[0-9a-f]{16}\.mp3$/.test(file)) return new Response("not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(process.cwd(), "data", "recaps", file));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
