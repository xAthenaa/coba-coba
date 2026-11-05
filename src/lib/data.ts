/** Konfigurasi & helper murni UI. Data dibaca dari API (src/lib/api.ts), bukan dari JSON. */
import type { CampusId, LatLng, Pin, WEvent, EventStatus, PinStatus } from "./types";

export const campuses: Record<CampusId, { id: CampusId; name: string; center: LatLng }> = {
  sudirman: { id: "sudirman", name: "Kampus Sudirman", center: { lat: -8.6724, lng: 115.2187 } },
  // Tempat Jimbaran (pl-jb-*) dari OSM; titik tengah kira-kira Rektorat/Widya Sabha.
  jimbaran: { id: "jimbaran", name: "Kampus Jimbaran", center: { lat: -8.7985, lng: 115.17 } },
};
export const DEFAULT_CAMPUS: CampusId = "sudirman";

export const faculties = ["FMIPA", "Teknik", "FKH", "FK", "Universitas"];


export function eventStatus(e: WEvent, now = new Date()): EventStatus {
  const s = new Date(e.start), en = new Date(e.end);
  if (now >= en) return "selesai";
  if (now >= s) return "berlangsung";
  return "akan datang";
}
export function pinStatus(p: Pin, now = new Date()): PinStatus {
  if (p.type === "permanent") return "Aktif";
  if (p.end && now >= new Date(p.end)) return "Kedaluwarsa";
  if (p.start && now < new Date(p.start)) return "Terjadwal";
  return "Aktif";
}
export const pinVisible = (p: Pin) => pinStatus(p) === "Aktif";

export function campusOf(ll: LatLng): CampusId {
  const d = (c: LatLng) => Math.abs(c.lat - ll.lat) + Math.abs(c.lng - ll.lng);
  return d(campuses.sudirman.center) <= d(campuses.jimbaran.center) ? "sudirman" : "jimbaran";
}

const fmtD = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Makassar" });
const fmtT = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" });
export const fmtDate = (iso: string) => fmtD.format(new Date(iso));
export const fmtTime = (iso: string) => fmtT.format(new Date(iso)).replace(":", ".");
export const fmtRange = (a: string, b: string) => `${fmtDate(a)} · ${fmtTime(a)}–${fmtTime(b)} WITA`;
