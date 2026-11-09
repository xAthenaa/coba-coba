import { db } from "./db";
import { E } from "./http";
import type { AuthUser } from "./auth";
import { CATEGORIES, FACILITY_TYPES, PIN_TYPES, REQ, asDate, asEnum, isNum, isStr } from "./validate";

/** Ambil event + pastikan milik organizer user (404 dulu, lalu 403). Admin boleh mengelola semua event. */
export async function ownedEvent(id: string, user: AuthUser) {
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") throw E.forbidden("Hanya untuk panitia");
  const ev = await db.event.findUnique({ where: { id }, include: { _count: { select: { registrations: true } } } });
  if (!ev) throw E.notFound("Event tidak ditemukan");
  if (user.role !== "ADMIN" && user.organizer?.id !== ev.organizerId) throw E.forbidden("Event ini milik penyelenggara lain");
  return ev;
}

type EvIn = { name: string; description: string; posterUrl: string | null; faculty: string; placeId: string; startAt: Date; endAt: Date; speakers: string[]; facilities: string[]; quota: number | null };
/** Validasi body event; `base` = nilai lama untuk PATCH; `registrants` = jumlah pendaftar saat ini (kuota tidak boleh di bawahnya). */
export async function validateEvent(b: Record<string, unknown>, base?: EvIn, registrants = 0): Promise<EvIn> {
  const f: Record<string, string> = {};
  const has = (k: string) => k in b || !base;
  const out = { ...(base ?? {}) } as EvIn;
  if (has("name")) { if (!isStr(b.name)) f.name = REQ; else out.name = b.name.trim(); }
  if (has("faculty")) { if (!isStr(b.faculty)) f.faculty = REQ; else out.faculty = b.faculty.trim(); }
  if ("description" in b || !base) out.description = typeof b.description === "string" ? b.description : "";
  if ("posterUrl" in b || !base) out.posterUrl = isStr(b.posterUrl) ? b.posterUrl : null;
  if (has("placeId")) {
    if (!isStr(b.placeId)) f.placeId = REQ;
    else if (!(await db.place.findUnique({ where: { id: b.placeId } }))) f.placeId = "Tempat tidak ditemukan";
    else out.placeId = b.placeId;
  }
  for (const k of ["startAt", "endAt"] as const) if (has(k)) {
    const d = asDate(b[k]);
    if (b[k] === undefined || b[k] === null || b[k] === "") f[k] = REQ; else if (!d) f[k] = "Format tanggal tidak valid"; else out[k] = d;
  }
  if (!f.startAt && !f.endAt && out.startAt && out.endAt && out.endAt <= out.startAt) f.endAt = "Waktu selesai harus setelah waktu mulai";
  if ("speakers" in b || !base) {
    const s = b.speakers ?? [];
    if (!Array.isArray(s) || s.some((x) => typeof x !== "string")) f.speakers = "Harus daftar teks"; else out.speakers = s.map((x: string) => x.trim()).filter(Boolean);
  }
  if ("facilities" in b || !base) {
    const s = b.facilities ?? [];
    if (!Array.isArray(s) || s.some((x) => typeof x !== "string")) f.facilities = "Harus daftar id tempat";
    else {
      const ids = [...new Set(s as string[])];
      const n = await db.place.count({ where: { id: { in: ids } } });
      if (n !== ids.length) f.facilities = "Ada tempat yang tidak ditemukan"; else out.facilities = ids;
    }
  }
  if ("quota" in b || !base) {
    const q = b.quota;
    if (q === undefined || q === null || q === "") out.quota = null;
    else if (typeof q !== "number" || !Number.isInteger(q) || q < 1) f.quota = "Kuota harus bilangan bulat ≥ 1 (kosongkan bila tanpa batas)";
    else if (q > 100000) f.quota = "Kuota maksimal 100000";
    else if (q < registrants) f.quota = `Kuota tidak boleh di bawah jumlah pendaftar saat ini (${registrants})`;
    else out.quota = q;
  }
  if (Object.keys(f).length) throw E.validation(f);
  return out;
}

type SchedIn = { title: string; startAt: Date; endAt: Date; speaker: string | null; location: string | null };
/** Validasi item jadwal/rundown. `base` = item lama untuk PATCH. */
export function validateSchedule(b: Record<string, unknown>, base?: SchedIn): SchedIn {
  const f: Record<string, string> = {};
  const has = (k: string) => k in b || !base;
  const out: SchedIn = base ? { title: base.title, startAt: base.startAt, endAt: base.endAt, speaker: base.speaker, location: base.location } : ({ speaker: null, location: null } as SchedIn);
  if (has("title")) { if (!isStr(b.title)) f.title = REQ; else if (b.title.trim().length > 200) f.title = "Maksimal 200 karakter"; else out.title = b.title.trim(); }
  for (const k of ["startAt", "endAt"] as const) if (has(k)) {
    const d = asDate(b[k]);
    if (b[k] === undefined || b[k] === null || b[k] === "") f[k] = REQ; else if (!d) f[k] = "Format tanggal tidak valid"; else out[k] = d;
  }
  if (!f.startAt && !f.endAt && out.startAt && out.endAt && out.endAt <= out.startAt) f.endAt = "Waktu selesai harus setelah waktu mulai";
  for (const k of ["speaker", "location"] as const) if (k in b) {
    if (b[k] === null || b[k] === "") out[k] = null; else if (typeof b[k] !== "string") f[k] = "Harus teks"; else out[k] = (b[k] as string).trim() || null;
  }
  if (Object.keys(f).length) throw E.validation(f);
  return out;
}

type PlaceIn = { name: string; category: string; campusId: string; lat: number; lng: number; description: string | null; photoUrl: string | null };
/** Validasi data master tempat (Admin). */
export async function validatePlace(b: Record<string, unknown>, base?: PlaceIn): Promise<PlaceIn> {
  const f: Record<string, string> = {};
  const has = (k: string) => k in b || !base;
  const out: PlaceIn = base ? { name: base.name, category: base.category, campusId: base.campusId, lat: base.lat, lng: base.lng, description: base.description, photoUrl: base.photoUrl } : ({ description: null, photoUrl: null } as PlaceIn);
  if (has("name")) { if (!isStr(b.name)) f.name = REQ; else out.name = b.name.trim(); }
  if (has("category")) { const c = asEnum(b.category, CATEGORIES); if (!c) f.category = b.category ? "Kategori tidak dikenal" : REQ; else out.category = c; }
  if (has("campusId")) {
    if (!isStr(b.campusId)) f.campusId = REQ;
    else if (!(await db.campus.findUnique({ where: { id: b.campusId } }))) f.campusId = "Kampus tidak ditemukan";
    else out.campusId = b.campusId;
  }
  for (const k of ["lat", "lng"] as const) if (has(k)) {
    const max = k === "lat" ? 90 : 180;
    if (b[k] === undefined || b[k] === null) f[k] = REQ;
    else if (!isNum(b[k])) f[k] = "Harus berupa angka";
    else if (Math.abs(b[k] as number) > max) f[k] = `Di luar rentang ±${max}`;
    else out[k] = b[k] as number;
  }
  for (const k of ["description", "photoUrl"] as const) if (k in b) out[k] = typeof b[k] === "string" && (b[k] as string).trim() ? (b[k] as string).trim() : null;
  if (Object.keys(f).length) throw E.validation(f);
  return out;
}

type FacIn = { name: string; category: string; description: string; placeId: string | null; available: boolean };
/** Validasi data master fasilitas (Admin). */
export async function validateFacility(b: Record<string, unknown>, base?: FacIn): Promise<FacIn> {
  const f: Record<string, string> = {};
  const has = (k: string) => k in b || !base;
  const out: FacIn = base ? { name: base.name, category: base.category, description: base.description, placeId: base.placeId, available: base.available } : ({ description: "", placeId: null, available: true } as FacIn);
  if (has("name")) { if (!isStr(b.name)) f.name = REQ; else out.name = b.name.trim(); }
  if (has("category")) { const c = asEnum(b.category, FACILITY_TYPES); if (!c) f.category = b.category ? "Jenis fasilitas tidak dikenal" : REQ; else out.category = c; }
  if ("description" in b) out.description = typeof b.description === "string" ? b.description.trim() : "";
  if ("placeId" in b) {
    if (b.placeId === null || b.placeId === "") out.placeId = null;
    else if (typeof b.placeId !== "string" || !(await db.place.findUnique({ where: { id: b.placeId } }))) f.placeId = "Tempat tidak ditemukan";
    else out.placeId = b.placeId;
  }
  if ("available" in b) { if (typeof b.available !== "boolean") f.available = "Harus true/false"; else out.available = b.available; }
  if (Object.keys(f).length) throw E.validation(f);
  return out;
}

type PinIn = { label: string; category: string; lat: number; lng: number; type: string; startAt: Date | null; endAt: Date | null };
/** Validasi pin (api-spec §8). `base` = pin lama untuk PATCH (nilai digabung). */
export function validatePin(b: Record<string, unknown>, base?: PinIn): PinIn {
  const f: Record<string, string> = {};
  const has = (k: string) => k in b || !base;
  const out = { startAt: null, endAt: null, ...(base ?? {}) } as PinIn;
  if (has("label")) { if (!isStr(b.label)) f.label = REQ; else out.label = b.label.trim(); }
  if (has("category")) { const c = asEnum(b.category, CATEGORIES); if (!c) f.category = b.category ? "Kategori tidak dikenal" : REQ; else out.category = c; }
  for (const k of ["lat", "lng"] as const) if (has(k)) {
    const max = k === "lat" ? 90 : 180;
    if (b[k] === undefined || b[k] === null) f[k] = REQ;
    else if (!isNum(b[k])) f[k] = "Harus berupa angka";
    else if (Math.abs(b[k] as number) > max) f[k] = `Di luar rentang ±${max}`;
    else out[k] = b[k] as number;
  }
  if (has("type")) { const t = asEnum(b.type, PIN_TYPES); if (!t) f.type = b.type ? "Tipe harus TIMED atau PERMANENT" : REQ; else out.type = t; }
  for (const k of ["startAt", "endAt"] as const) if (k in b) {
    if (b[k] === null || b[k] === "") out[k] = null;
    else { const d = asDate(b[k]); if (!d) f[k] = "Format tanggal tidak valid"; else out[k] = d; }
  }
  if (!f.type && out.type === "PERMANENT" && (out.startAt || out.endAt)) {
    if (out.startAt) f.startAt = "Pin permanen tidak boleh punya rentang waktu";
    if (out.endAt) f.endAt = "Pin permanen tidak boleh punya rentang waktu";
  }
  if (!f.type && out.type === "TIMED") {
    if (!out.startAt && !f.startAt) f.startAt = "Wajib diisi untuk pin berbasis waktu";
    if (!out.endAt && !f.endAt) f.endAt = "Wajib diisi untuk pin berbasis waktu";
    if (out.startAt && out.endAt && out.endAt <= out.startAt) f.endAt = "Waktu hapus harus setelah waktu pasang";
  }
  if (Object.keys(f).length) throw E.validation(f);
  return out;
}
