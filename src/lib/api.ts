"use client";
/**
 * Lapisan akses data (async). Saat ini membaca/menulis data contoh (JSON + localStorage via store.ts).
 * Nanti cukup ganti isi fungsi ini dengan fetch ke Route Handlers (/api/...) — signature tetap.
 * Catatan: layar membaca data secara reaktif lewat hook useDB(); setelah migrasi, ganti hook tsb dengan SWR/React Query di atas fungsi get*.
 */
import { organizers, places, notifications } from "./data";
import { useDB, writeDB } from "./store";
import type { Pin, WEvent } from "./types";

const snapshot = () => JSON.parse(localStorage.getItem("wayo-db-v1") ?? "null") as { events: WEvent[]; pins: Pin[] } | null;
const tick = () => new Promise((r) => setTimeout(r, 0));

export async function getEvents(): Promise<WEvent[]> { await tick(); return snapshot()?.events ?? (await import("./data")).baseEvents; }
export async function getEvent(id: string) { return (await getEvents()).find((e) => e.id === id) ?? null; }
export async function getPlaces() { return places; }
export async function getOrganizers() { return organizers; }
export async function getNotifications() { return notifications; }

export async function saveEvent(e: WEvent): Promise<WEvent> {
  await tick();
  writeDB((d) => ({ ...d, events: d.events.some((x) => x.id === e.id) ? d.events.map((x) => (x.id === e.id ? e : x)) : [...d.events, e] }));
  return e;
}
export async function deleteEvent(id: string) {
  await tick();
  writeDB((d) => ({ ...d, events: d.events.filter((e) => e.id !== id), pins: d.pins.filter((p) => p.eventId !== id) }));
}
export async function savePin(p: Pin): Promise<Pin> {
  if (p.type === "timed" && (!p.start || !p.end || new Date(p.end) <= new Date(p.start))) throw new Error("Waktu hapus harus setelah waktu pasang");
  await tick();
  writeDB((d) => ({ ...d, pins: d.pins.some((x) => x.id === p.id) ? d.pins.map((x) => (x.id === p.id ? p : x)) : [...d.pins, p] }));
  return p;
}
export async function deletePin(id: string) { await tick(); writeDB((d) => ({ ...d, pins: d.pins.filter((p) => p.id !== id) })); }
export async function registerEvent(id: string) { await tick(); writeDB((d) => ({ ...d, registered: d.registered.includes(id) ? d.registered : [...d.registered, id] })); }

export { useDB };
