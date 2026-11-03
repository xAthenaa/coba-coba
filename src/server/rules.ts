import { db } from "./db";
import { E } from "./http";
import type { AuthUser } from "./auth";
import { CATEGORIES, PIN_TYPES, REQ, asDate, asEnum, isNum, isStr } from "./validate";

/** Ambil event + pastikan milik organizer user (404 dulu, lalu 403). */
export async function ownedEvent(id: string, user: AuthUser) {
  const ev = await db.event.findUnique({ where: { id } });
  if (!ev) throw E.notFound("Event tidak ditemukan");
  if (user.role !== "ORGANIZER") throw E.forbidden("Hanya untuk panitia");
  if (user.organizer?.id !== ev.organizerId) throw E.forbidden("Event ini milik penyelenggara lain");
  return ev;
}

type EvIn = { name: string; description: string; posterUrl: string | null; faculty: string; placeId: string; startAt: Date; endAt: Date; speakers: string[]; facilities: string[] };
/** Validasi body event; `base` = nilai lama untuk PATCH. */
export async function validateEvent(b: Record<string, unknown>, base?: EvIn): Promise<EvIn> {
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
