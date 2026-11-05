import { NextResponse } from "next/server";

/** Proxy rute jalan raya via OSRM publik. GET /api/route?from=lat,lng&to=lat,lng → { points: [lat,lng][], distance, duration } */
const OSRM = process.env.OSRM_URL ?? "https://router.project-osrm.org";
const cache = new Map<string, { points: [number, number][]; distance: number; duration: number }>();

function parse(s: string | null) {
  const [lat, lng] = (s ?? "").split(",").map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const from = parse(u.searchParams.get("from")), to = parse(u.searchParams.get("to"));
  if (!from || !to) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Parameter from/to tidak valid" } }, { status: 400 });
  const key = [from.lat, from.lng, to.lat, to.lng].map((n) => n.toFixed(4)).join(",");
  const hit = cache.get(key);
  if (hit) return NextResponse.json(hit);
  try {
    const url = `${OSRM}/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    const j = await res.json();
    const rt = j?.routes?.[0];
    if (!res.ok || j.code !== "Ok" || !rt?.geometry?.coordinates?.length) throw new Error("no route");
    const points = (rt.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
    const out = { points: [[from.lat, from.lng], ...points, [to.lat, to.lng]] as [number, number][], distance: rt.distance as number, duration: rt.duration as number };
    if (cache.size > 500) cache.clear();
    cache.set(key, out);
    return NextResponse.json(out);
  } catch {
    return NextResponse.json({ error: { code: "ROUTING_FAILED", message: "Rute jalan tidak tersedia" } }, { status: 502 });
  }
}
