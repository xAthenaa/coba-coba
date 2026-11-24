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
/** Titik sejauh d meter di sepanjang polyline. Polyline kosong → undefined (pemanggil wajib menyediakan cadangan). */
export function pointAlong(p: LatLng[], d: number): LatLng | undefined {
  if (!p.length) return undefined;
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
/** Potongan awal polyline sepanjang d meter (untuk jejak "sudah dilalui"). */
export function pathUntil(p: LatLng[], d: number): LatLng[] {
  const out: LatLng[] = p.length ? [p[0]] : [];
  for (let i = 1; i < p.length; i++) {
    const seg = distance(p[i - 1], p[i]);
    if (d <= seg) { const q = pointAlong(p, pathLength(p.slice(0, i)) + d); if (q) out.push(q); return out; }
    out.push(p[i]); d -= seg;
  }
  return out;
}

/** Ambang 'cara 1': rute OSRM yang memutar jauh pada jarak pendek diganti garis lurus (jalan dalam kampus sering tidak ada di OSM). */
export const CAMPUS_STRAIGHT_MAX_M = 500;
export const CAMPUS_DETOUR_RATIO = 2.5;
export const CAMPUS_STRAIGHT_NOTE = "Jalur dalam kampus (perkiraan garis lurus)";

/** true jika jarak lurus < 500 m dan panjang rute > 2,5× jarak lurus. */
export function shouldUseCampusStraight(straightM: number, routeM: number): boolean {
  return straightM > 0 && straightM < CAMPUS_STRAIGHT_MAX_M && routeM > CAMPUS_DETOUR_RATIO * straightM;
}

/** Setelah rute OSRM didapat: jika memutar, ganti jadi segmen lurus start→tujuan. */
export function maybeCampusStraight(from: LatLng, to: LatLng, roadRoute: LatLng[]): { route: LatLng[]; campusStraight: boolean } {
  const straightM = distance(from, to);
  const routeM = pathLength(roadRoute);
  if (shouldUseCampusStraight(straightM, routeM)) return { route: [from, to], campusStraight: true };
  return { route: roadRoute, campusStraight: false };
}

