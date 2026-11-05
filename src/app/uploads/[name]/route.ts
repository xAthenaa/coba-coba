import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Sajikan file unggahan dari data/uploads (bukan public/, agar tetap tersedia setelah build). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const m = /^[a-z0-9-]+\.(jpg|png|webp)$/.exec(name);
  if (!m) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(process.cwd(), "data", "uploads", name));
    return new Response(new Uint8Array(buf), { headers: { "content-type": MIME[m[1]], "cache-control": "public, max-age=31536000, immutable" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
