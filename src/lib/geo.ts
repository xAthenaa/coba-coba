import type { LatLng } from "./types";

export const WALK_SPEED = 1.3; // m/s (~4.7 km/j)
export function distance(a: LatLng, b: LatLng) {
  const R = 6371000, t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m)} m`);
export const walkMin = (m: number) => Math.max(1, Math.round(m / WALK_SPEED / 60));

/** Rute jalan kaki SIMULASI: garis berbentuk L (belok di sudut) — tanpa API routing. */
export function simRoute(from: LatLng, to: LatLng): LatLng[] {
  return [from, { lat: from.lat, lng: to.lng }, to];
}
export const pathLength = (p: LatLng[]) => p.slice(1).reduce((s, q, i) => s + distance(p[i], q), 0);
export function pointAlong(p: LatLng[], d: number): LatLng {
  for (let i = 1; i < p.length; i++) {
    const seg = distance(p[i - 1], p[i]);
    if (d <= seg) { const f = seg ? d / seg : 0; return { lat: p[i - 1].lat + (p[i].lat - p[i - 1].lat) * f, lng: p[i - 1].lng + (p[i].lng - p[i - 1].lng) * f }; }
    d -= seg;
  }
  return p[p.length - 1];
}
export function turnText(p: LatLng[]) {
  if (p.length < 3) return "Lurus ke tujuan";
  const a = p[0], b = p[1], c = p[2];
  const cross = (b.lng - a.lng) * (c.lat - b.lat) - (b.lat - a.lat) * (c.lng - b.lng);
  return cross > 0 ? "Belok kiri" : "Belok kanan";
}
