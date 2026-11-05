"use client";
/**
 * Lapisan akses data UI → Route Handlers (/api/*), memakai SWR.
 * Respons API dipetakan ke tipe UI (src/lib/types.ts): kategori/tipe huruf kecil, startAt→start, dst.
 */
import useSWR, { mutate as globalMutate } from "swr";
import type { CampusId, Category, Notif, Organizer, Pin, Place, WEvent } from "./types";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? "GET", credentials: "same-origin",
    headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, j?.error?.code ?? "ERROR", j?.error?.message ?? `HTTP ${res.status}`, j?.error?.fields);
  return j?.data as T;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetcher = (p: string): Promise<any> => api(p);

/* ---------- pemetaan API → UI ---------- */
type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const lc = (s: string) => (s ?? "").toLowerCase();
export const toPlace = (p: R): Place => ({ id: p.id, name: p.name, category: lc(p.category) as Category, lat: p.lat, lng: p.lng, campus: p.campusId as CampusId, description: p.description ?? undefined, ...(p.distanceM !== undefined ? { distanceM: p.distanceM, walkMin: p.walkMin } : {}) });
export type UIEvent = WEvent & { registered?: boolean; registrantCount?: number; place?: Place; organizerName?: string };
export const toEvent = (e: R): UIEvent => ({
  id: e.id, organizerId: e.organizerId, name: e.name, description: e.description, poster: e.posterUrl ?? "", placeId: e.placeId, faculty: e.faculty,
  start: e.startAt, end: e.endAt, speakers: e.speakers ?? [], facilities: (e.facilities ?? []).map((f: R) => f.id),
  registered: e.registered, registrantCount: e.registrantCount, place: e.place ? toPlace(e.place) : undefined, organizerName: e.organizer?.name,
});
export const toPin = (p: R): Pin & { status?: string } => ({ id: p.id, eventId: p.eventId, label: p.label, category: lc(p.category) as Category, lat: p.lat, lng: p.lng, type: lc(p.type) as Pin["type"], start: p.startAt ?? undefined, end: p.endAt ?? undefined, status: p.status });
export const toOrganizer = (o: R): Organizer & { eventCount?: number } => ({ id: o.id, name: o.name, logo: o.logoUrl ?? "", description: o.description, contact: o.contact, faculty: o.faculty, eventCount: o.eventCount });
export const toNotif = (n: R): Notif & { read: boolean } => ({ id: n.id, type: lc(n.type), eventId: n.eventId ?? undefined, pinId: n.pinId ?? undefined, text: n.text, time: n.createdAt, read: n.read });
const fromPin = (p: Partial<Pin>) => ({ label: p.label, category: p.category?.toUpperCase(), lat: p.lat, lng: p.lng, type: p.type?.toUpperCase(), startAt: p.type === "timed" ? p.start || null : null, endAt: p.type === "timed" ? p.end || null : null });
const fromEvent = (e: Partial<WEvent>) => ({ name: e.name, description: e.description, posterUrl: e.poster || null, placeId: e.placeId, faculty: e.faculty, startAt: e.start, endAt: e.end, speakers: e.speakers, facilities: e.facilities });

/* ---------- hooks baca ---------- */
function useList<T>(key: string | null, map: (x: R) => T) {
  const { data, error, isLoading, mutate } = useSWR<R[]>(key, fetcher);
  return { data: data?.map(map), error: error as ApiError | undefined, isLoading, mutate };
}
export const useEvents = (q = "") => useList(`/api/events${q}`, toEvent);
export const useEvent = (id?: string) => { const s = useSWR<R>(id ? `/api/events/${id}` : null, fetcher); return { ...s, data: s.data ? toEvent(s.data) : undefined, error: s.error as ApiError | undefined }; };
export const usePlaces = (q = "") => useList(`/api/places${q}`, toPlace);
export const useActivePins = () => useList("/api/pins", toPin);
export const useEventPins = (id?: string) => useList(id ? `/api/events/${id}/pins` : null, toPin);
export const useOrganizers = (q = "") => useList(`/api/organizers${q ? `?q=${encodeURIComponent(q)}` : ""}`, toOrganizer);
export const useOrganizer = (id?: string) => { const s = useSWR<R>(id ? `/api/organizers/${id}` : null, fetcher); return { ...s, data: s.data ? { ...toOrganizer(s.data), events: ((s.data.events ?? []) as R[]).map(toEvent) } : undefined }; };
export const useRegistrations = (tab: "terdaftar" | "terlewati") => useList(`/api/me/registrations?tab=${tab}`, toEvent);
export function useNotifications() {
  const s = useSWR<R>("/api/notifications", fetcher, { refreshInterval: 60_000 });
  return { ...s, data: s.data ? { unreadCount: s.data.unreadCount as number, items: (s.data.items as R[]).map(toNotif) } : undefined };
}
export const useQr = (eventId?: string) => useSWR<{ code: string; url: string }>(eventId ? `/api/events/${eventId}/qr` : null, fetcher);

/** Indeks tempat (id → Place) untuk layar yang butuh nama tempat. */
export function usePlaceIndex() {
  const { data } = usePlaces();
  const map = new Map((data ?? []).map((p) => [p.id, p]));
  return { places: data ?? [], place: (id?: string) => (id ? map.get(id) : undefined), loading: !data };
}

/* ---------- mutasi ---------- */
const refresh = (prefixes: string[]) => globalMutate((k) => typeof k === "string" && prefixes.some((p) => k.startsWith(p)));
export async function saveEvent(e: Partial<WEvent> & { id?: string }): Promise<UIEvent> {
  const out = e.id ? await api<R>(`/api/events/${e.id}`, { method: "PATCH", body: fromEvent(e) }) : await api<R>("/api/events", { method: "POST", body: fromEvent(e) });
  await refresh(["/api/events", "/api/organizers"]);
  return toEvent(out);
}
export async function deleteEvent(id: string) { await api(`/api/events/${id}`, { method: "DELETE" }); await refresh(["/api/events", "/api/organizers", "/api/pins"]); }
export async function savePin(p: Partial<Pin> & { eventId: string; id?: string }) {
  const out = p.id ? await api<R>(`/api/pins/${p.id}`, { method: "PATCH", body: fromPin(p) }) : await api<R>(`/api/events/${p.eventId}/pins`, { method: "POST", body: fromPin(p) });
  await refresh(["/api/pins", `/api/events/${p.eventId}/pins`]);
  return toPin(out);
}
export async function deletePin(id: string, eventId?: string) { await api(`/api/pins/${id}`, { method: "DELETE" }); await refresh(["/api/pins", ...(eventId ? [`/api/events/${eventId}/pins`] : [])]); }
export async function registerEvent(id: string) { await api(`/api/events/${id}/register`, { method: "POST" }); await refresh(["/api/events", "/api/me/registrations"]); }
export async function unregisterEvent(id: string) { await api(`/api/events/${id}/register`, { method: "DELETE" }); await refresh(["/api/events", "/api/me/registrations"]); }
export async function regenerateQr(eventId: string) { const q = await api<{ code: string; url: string }>(`/api/events/${eventId}/qr/regenerate`, { method: "POST" }); await globalMutate(`/api/events/${eventId}/qr`, q, false); return q; }
export async function resolveQr(code: string) { return api<{ eventId: string; placeId: string; lat: number; lng: number; campusId: string }>(`/api/qr/${encodeURIComponent(code)}`); }
export async function readNotif(id: string) { await api(`/api/notifications/${id}/read`, { method: "POST" }); await globalMutate("/api/notifications"); }
export async function readAllNotifs() { await api("/api/notifications/read-all", { method: "POST" }); await globalMutate("/api/notifications"); }
export async function updateProfile(body: { name?: string; email?: string; phone?: string | null; faculty?: string | null; defaultCampusId?: string }) { const u = await api("/api/me", { method: "PATCH", body }); await globalMutate("/api/me"); return u; }

/** Unggah poster (multipart) → URL publik /uploads/... */
export async function uploadPoster(file: File): Promise<string> {
  const fd = new FormData(); fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "same-origin" });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, j?.error?.code ?? "ERROR", j?.error?.fields?.file ?? j?.error?.message ?? `HTTP ${res.status}`, j?.error?.fields);
  return j.data.url as string;
}
