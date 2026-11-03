/**
 * Data contoh (mock) dari Gigi: /data/*.json (bertanda "_contoh"), Kampus Sudirman.
 * File ini = seed sinkron + helper murni. Akses data dari UI lewat src/lib/api.ts (async, siap diganti fetch ke Route Handlers).
 * Untuk mengganti data, cukup ganti file JSON; bentuk field mengikuti src/lib/types.ts.
 */
import eventsJson from "@data/events.json";
import organizersJson from "@data/organizers.json";
import pinsJson from "@data/pins.json";
import placesJson from "@data/places.json";
import notifJson from "@data/notifications.json";
import usersJson from "@data/users.json";
import type { CampusId, LatLng, Notif, Organizer, Pin, Place, WEvent, EventStatus, PinStatus } from "./types";

export const campuses: Record<CampusId, { id: CampusId; name: string; center: LatLng }> = {
  sudirman: { id: "sudirman", name: "Kampus Sudirman", center: placesJson.center },
  // Peta Jimbaran belum dibuat (design-notes UPDATE 13): hanya titik tengah, tanpa data tempat.
  jimbaran: { id: "jimbaran", name: "Kampus Jimbaran", center: { lat: -8.7985, lng: 115.17 } },
};
export const DEFAULT_CAMPUS: CampusId = "sudirman";

export const places: Place[] = (placesJson.places as Omit<Place, "campus">[]).map((p) => ({ ...p, campus: "sudirman" as const }));
export const baseEvents: WEvent[] = eventsJson.events as WEvent[];
export const organizers: Organizer[] = organizersJson.organizers as Organizer[];
export const basePins: Pin[] = pinsJson.pins as Pin[];
export const notifications: Notif[] = notifJson.notifications as Notif[];
export const users = usersJson.users;
export const faculties = ["FMIPA", "Teknik", "FKH", "FK", "Universitas"];

export const getPlace = (id: string) => places.find((p) => p.id === id);
export const getOrganizer = (id: string) => organizers.find((o) => o.id === id);

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
