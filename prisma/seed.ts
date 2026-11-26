/* Seed idempoten (upsert) dari /data/*.json — api-spec.md §5. ID JSON dipertahankan.
 * Places: data/places.json berisi 2 tempat seed (Rektorat Jimbaran, FK Sudirman). Pins tetap kosong.
 * Event.placeId wajib (FK non-null), jadi event + turunannya hanya di-seed jika tempat rujukannya ada. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import places from "../data/places.json";
import users from "../data/users.json";
import organizers from "../data/organizers.json";
import events from "../data/events.json";
import pins from "../data/pins.json";
import notifs from "../data/notifications.json";

const db = new PrismaClient();
const code = () => randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);

type PlaceRow = { id: string; name: string; category: string; lat: number; lng: number; campusId?: string };
type PinRow = { id: string; eventId: string; label: string; category: string; lat: number; lng: number; type: string; start?: string; end?: string };
const placeList = places.places as PlaceRow[];
const pinList = pins.pins as PinRow[];

async function upsertAdmin(id: string, name: string, emailEnv: string, emailDefault: string, passEnv: string) {
  const passwordHash = await bcrypt.hash(process.env[passEnv] || "admin123", 10);
  const adm = { name, email: (process.env[emailEnv] || emailDefault).toLowerCase(), passwordHash, role: "ADMIN" as const, active: true };
  await db.user.upsert({ where: { id }, create: { id, ...adm }, update: adm });
}

async function main() {
  const hash = await bcrypt.hash("demo123", 10);
  const placeIds = new Set(placeList.map((p) => p.id));
  const skipped = { events: 0, eventFacilities: 0, qrMaps: 0, registrations: 0, schedules: 0, pins: 0 };

  for (const c of [
    { id: "sudirman", name: "Sudirman", centerLat: places.center.lat, centerLng: places.center.lng, zoom: 17 },
    { id: "jimbaran", name: "Jimbaran", centerLat: -8.7985, centerLng: 115.17, zoom: 16 },
  ]) await db.campus.upsert({ where: { id: c.id }, create: c, update: c });

  for (const p of placeList) {
    const d = { name: p.name, category: p.category.toUpperCase(), lat: p.lat, lng: p.lng, campusId: ("campusId" in p && p.campusId) || "sudirman" };
    await db.place.upsert({ where: { id: p.id }, create: { id: p.id, ...d }, update: d });
  }
  for (const u of users.users) {
    const d = { name: u.name, email: u.email.toLowerCase(), passwordHash: hash, role: u.role === "organizer" ? "ORGANIZER" : "VISITOR" };
    await db.user.upsert({ where: { id: u.id }, create: { id: u.id, ...d }, update: d });
  }
  for (const o of organizers.organizers) {
    const owner = users.users.find((u) => u.organizerId === o.id);
    let ownerId = owner?.id;
    if (!ownerId) { // owner dummy untuk organizer tanpa akun di users.json
      ownerId = `u-owner-${o.id}`;
      const d = { name: `Admin ${o.name}`, email: `owner-${o.id}@contoh.id`, passwordHash: hash, role: "ORGANIZER" };
      await db.user.upsert({ where: { id: ownerId }, create: { id: ownerId, ...d }, update: d });
    }
    const d = { name: o.name, logoUrl: o.logo, description: o.description, contact: o.contact, faculty: o.faculty, ownerId };
    await db.organizer.upsert({ where: { id: o.id }, create: { id: o.id, ...d }, update: d });
  }
  for (const e of events.events) {
    const missing = [e.placeId, ...e.facilities].filter((id) => !placeIds.has(id));
    if (missing.length) {
      skipped.events++;
      skipped.eventFacilities += e.facilities.length;
      skipped.qrMaps++;
      continue;
    }
    const d = { organizerId: e.organizerId, placeId: e.placeId, name: e.name, description: e.description, posterUrl: e.poster || null,
      faculty: e.faculty, startAt: new Date(e.start), endAt: new Date(e.end), speakers: JSON.stringify(e.speakers ?? []) };
    await db.event.upsert({ where: { id: e.id }, create: { id: e.id, ...d }, update: d });
    for (const f of e.facilities) await db.eventFacility.upsert({ where: { eventId_placeId: { eventId: e.id, placeId: f } }, create: { eventId: e.id, placeId: f }, update: {} });
    await db.qrMap.upsert({ where: { eventId: e.id }, create: { eventId: e.id, targetPlaceId: e.placeId, code: code() }, update: {} });
  }
  for (const p of pinList) {
    const ev = await db.event.findUnique({ where: { id: p.eventId } });
    if (!ev) { skipped.pins++; continue; }
    const d = { eventId: p.eventId, label: p.label, category: p.category.toUpperCase(), lat: p.lat, lng: p.lng,
      type: p.type === "timed" ? "TIMED" : "PERMANENT", startAt: "start" in p && p.start ? new Date(p.start) : null, endAt: "end" in p && p.end ? new Date(p.end) : null };
    await db.pin.upsert({ where: { id: p.id }, create: { id: p.id, ...d }, update: d });
  }
  for (const u of users.users) for (const eid of u.registeredEvents ?? []) {
    const ev = await db.event.findUnique({ where: { id: eid } });
    if (!ev) { skipped.registrations++; continue; }
    await db.registration.upsert({ where: { userId_eventId: { userId: u.id, eventId: eid } }, create: { userId: u.id, eventId: eid }, update: {} });
  }
  for (const n of notifs.notifications) {
    // eventId/pinId di Notification bukan FK — notifikasi demo tetap di-seed meski pin/event tidak ada.
    const d = { userId: "u-pengunjung", type: n.type.toUpperCase(), text: n.text, eventId: n.eventId ?? null, pinId: n.pinId ?? null, createdAt: new Date(n.time) };
    await db.notification.upsert({ where: { id: n.id }, create: { id: n.id, ...d }, update: d });
  }
  // --- Tambahan (fitur Admin/fasilitas/jadwal) — data JSON lama tidak diubah ---
  // Akun Admin hanya dibuat lewat seed (tidak bisa lewat daftar publik). Ganti password di produksi (env WAYO_ADMIN*_PASSWORD).
  await upsertAdmin("u-admin", "Admin WAYO", "WAYO_ADMIN_EMAIL", "admin@wayo.local", "WAYO_ADMIN_PASSWORD");
  await upsertAdmin("u-admin-2", "Admin WAYO 2", "WAYO_ADMIN2_EMAIL", "admin2@wayo.local", "WAYO_ADMIN2_PASSWORD");
  await upsertAdmin("u-admin-3", "Admin WAYO 3", "WAYO_ADMIN3_EMAIL", "admin3@wayo.local", "WAYO_ADMIN3_PASSWORD");
  for (const f of [
    { id: "fac-toilet-aud", name: "Toilet Auditorium", category: "TOILET", placeId: "pl-toilet-aud", description: "Toilet pria & wanita dekat aula" },
    { id: "fac-toilet-fk", name: "Toilet FK", category: "TOILET", placeId: "pl-toilet-fmipa", description: "" },
    { id: "fac-parkir-utama", name: "Parkir Utama", category: "PARKIR", placeId: "pl-parkir-utama", description: "Parkir motor & mobil" },
    { id: "fac-kantin-pusat", name: "Kantin Pusat", category: "KANTIN", placeId: "pl-kantin-pusat", description: "" },
    { id: "fac-info", name: "Meja Informasi", category: "LAINNYA", placeId: "pl-info", description: "Pusat informasi kampus" },
    { id: "fac-jb-kantin1", name: "Kantin 1 Jimbaran", category: "KANTIN", placeId: "pl-jb-kantin1", description: "" },
  ]) {
    const d = { name: f.name, category: f.category, description: f.description, placeId: placeIds.has(f.placeId) ? f.placeId : null };
    await db.facility.upsert({ where: { id: f.id }, create: { id: f.id, ...d }, update: d });
  }
  const inv = events.events.find((e) => e.id === "ev-invention");
  const invRow = inv ? await db.event.findUnique({ where: { id: inv.id } }) : null;
  if (inv && invRow) {
    const s0 = new Date(inv.start).getTime(), H = 3600e3;
    for (const s of [
      { id: "sch-inv-1", title: "Registrasi & pembukaan", startAt: new Date(s0), endAt: new Date(s0 + 0.5 * H), speaker: null, location: "Lobi" },
      { id: "sch-inv-2", title: "Pameran karya mahasiswa", startAt: new Date(s0 + 0.5 * H), endAt: new Date(s0 + 2 * H), speaker: null, location: "Aula" },
      { id: "sch-inv-3", title: "Penjurian & penutupan", startAt: new Date(s0 + 2 * H), endAt: new Date(s0 + 3 * H), speaker: "Dewan juri", location: "Aula" },
    ]) await db.eventSchedule.upsert({ where: { id: s.id }, create: { ...s, eventId: inv.id }, update: { ...s, eventId: inv.id } });
  } else if (inv) {
    skipped.schedules += 3;
  }
  if (skipped.events || skipped.pins) {
    console.log("Seed: data dependen dilewati karena Place/Pin kosong atau rujukan tidak ada.", skipped,
      "Alasan event: Event.placeId wajib (FK non-null); tanpa baris Place event tidak bisa dibuat. QrMap, EventFacility, Registration, dan EventSchedule mengikuti event. Facility.placeId di-set null (nullable). Notification.eventId/pinId bukan FK, tetap di-seed.");
  }
  console.log("Seed selesai:", { campuses: await db.campus.count(), places: await db.place.count(), users: await db.user.count(), organizers: await db.organizer.count(), events: await db.event.count(), pins: await db.pin.count(), facilities: await db.facility.count(), schedule: await db.eventSchedule.count(), admins: await db.user.count({ where: { role: "ADMIN" } }), dilewati: skipped });
}
main().finally(() => db.$disconnect());
