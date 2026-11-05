/* Seed idempoten (upsert) dari /data/*.json — api-spec.md §5. ID JSON dipertahankan. */
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

async function main() {
  const hash = await bcrypt.hash("demo123", 10);
  for (const c of [
    { id: "sudirman", name: "Sudirman", centerLat: places.center.lat, centerLng: places.center.lng, zoom: 17 },
    { id: "jimbaran", name: "Jimbaran", centerLat: -8.7985, centerLng: 115.17, zoom: 16 },
  ]) await db.campus.upsert({ where: { id: c.id }, create: c, update: c });

  for (const p of places.places) {
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
  for (const n of notifs.notifications) {
    const d = { userId: "u-pengunjung", type: n.type.toUpperCase(), text: n.text, eventId: n.eventId ?? null, pinId: n.pinId ?? null, createdAt: new Date(n.time) };
    await db.notification.upsert({ where: { id: n.id }, create: { id: n.id, ...d }, update: d });
  }
  console.log("Seed selesai:", { campuses: await db.campus.count(), places: await db.place.count(), users: await db.user.count(), organizers: await db.organizer.count(), events: await db.event.count(), pins: await db.pin.count() });
}
main().finally(() => db.$disconnect());
