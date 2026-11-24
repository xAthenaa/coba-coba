import { getObject } from "@/server/storage";

export const runtime = "nodejs";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Sajikan file unggahan (disk data/uploads atau Vercel Blob). URL publik tetap /uploads/[name]. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const m = /^[a-z0-9-]+\.(jpg|png|webp)$/.exec(name);
  if (!m) return new Response("Not found", { status: 404 });
  const buf = await getObject("uploads", name);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), { headers: { "content-type": MIME[m[1]], "cache-control": "public, max-age=31536000, immutable" } });
}
