/* Pasang data peta contoh untuk tes API/e2e — bukan bagian seed produksi.
 * Seed mengosongkan Place & Pin (dan melewati Event karena placeId wajib).
 * Tes yang mengandalkan ID lama (pl-*, ev-*, pin-*) memanggil skrip ini setelah seed. */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import places from "./fixtures/places.json";
import pins from "./fixtures/pins.json";
import events from "../data/events.json";
import users from "../data/users.json";

const code = () => randomBytes(8).toString("base64url").replace(/[-_]/g, "x").slice(0, 10);

export async function installMapFixtures(db: PrismaClient) {
  for (const p of places.places) {
    const d = { name: p.name, category: p.category.toUpperCase(), lat: p.lat, lng: p.lng, campusId: ("campusId" in p && p.campusId) || "sudirman" };
    await db.place.upsert({ where: { id: p.id }, create: { id: p.id, ...d }, update: d });
  }
  const placeIds = new Set(places.places.map((p) => p.id));
  for (const e of events.events) {
    const missing = [e.placeId, ...e.facilities].filter((id) => !placeIds.has(id));
    if (missing.length) throw new Error(`Fixture event ${e.id} merujuk tempat yang tidak ada: ${missing.join(", ")}`);
    const d = { organizerId: e.organizerId, placeId: e.placeId, name: e.name, description: e.description, posterUrl: e.poster || null,
      faculty: e.faculty, startAt: new Date(e.start), endAt: new Date(e.end), speakers: JSON.stringify(e.speakers ?? []) };
    await db.event.upsert({ where: { id: e.id }, create: { id: e.id, ...d }, update: d });
    for (const f of e.facilities) await db.eventFacility.upsert({ where: { eventId_placeId: { eventId: e.id, placeId: f } }, create: { eventId: e.id, placeId: f }, update: {} });
    await db.qrMap.upsert({ where: { eventId: e.id }, create: { eventId: e.id, targetPlaceId: e.placeId, code: code() }, update: {} });
  }
  for (const p of pins.pins) {
    const d = { eventId: p.eventId, label: p.label, category: p.category.toUpperCase(), lat: p.lat, lng: p.lng,
      type: p.type === "timed" ? "TIMED" : "PERMANENT", startAt: "start" in p && p.start ? new Date(p.start) : null, endAt: "end" in p && p.end ? new Date(p.end) : null };
    await db.pin.upsert({ where: { id: p.id }, create: { id: p.id, ...d }, update: d });
  }
  for (const u of users.users) for (const eid of u.registeredEvents ?? [])
    await db.registration.upsert({ where: { userId_eventId: { userId: u.id, eventId: eid } }, create: { userId: u.id, eventId: eid }, update: {} });
  const inv = events.events.find((e) => e.id === "ev-invention");
  if (inv) {
    const s0 = new Date(inv.start).getTime(), H = 3600e3;
    for (const s of [
      { id: "sch-inv-1", title: "Registrasi & pembukaan", startAt: new Date(s0), endAt: new Date(s0 + 0.5 * H), speaker: null, location: "Lobi" },
      { id: "sch-inv-2", title: "Pameran karya mahasiswa", startAt: new Date(s0 + 0.5 * H), endAt: new Date(s0 + 2 * H), speaker: null, location: "Aula" },
      { id: "sch-inv-3", title: "Penjurian & penutupan", startAt: new Date(s0 + 2 * H), endAt: new Date(s0 + 3 * H), speaker: "Dewan juri (contoh)", location: "Aula" },
    ]) await db.eventSchedule.upsert({ where: { id: s.id }, create: { ...s, eventId: inv.id }, update: { ...s, eventId: inv.id } });
  }
}

async function main() {
  const db = new PrismaClient();
  try {
    await installMapFixtures(db);
    console.log("Fixture peta tes terpasang:", {
      places: await db.place.count(),
      events: await db.event.count(),
      pins: await db.pin.count(),
      qr: await db.qrMap.count(),
      schedule: await db.eventSchedule.count(),
    });
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
