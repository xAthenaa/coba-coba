import type { Event, Organizer, Pin, Place, User } from "@prisma/client";

export type EventStatus = "UPCOMING" | "ONGOING" | "ENDED";
export type PinStatus = "SCHEDULED" | "ACTIVE" | "EXPIRED";
export function eventStatus(e: Pick<Event, "startAt" | "endAt">, now = new Date()): EventStatus {
  return now >= e.endAt ? "ENDED" : now >= e.startAt ? "ONGOING" : "UPCOMING";
}
export function pinStatus(p: Pick<Pin, "type" | "startAt" | "endAt">, now = new Date()): PinStatus {
  if (p.type === "PERMANENT") return "ACTIVE";
  if (p.endAt && now >= p.endAt) return "EXPIRED";
  if (p.startAt && now < p.startAt) return "SCHEDULED";
  return "ACTIVE";
}
/** Filter Prisma untuk pin aktif saat ini. */
export const activePinWhere = (now = new Date()) => ({
  OR: [{ type: "PERMANENT" }, { type: "TIMED", AND: [{ OR: [{ startAt: null }, { startAt: { lte: now } }] }, { OR: [{ endAt: null }, { endAt: { gt: now } }] }] }],
});

export const userOut = (u: User & { organizer?: Organizer | null }) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl, phone: u.phone, faculty: u.faculty,
  defaultCampusId: u.defaultCampusId, organizerId: u.organizer?.id ?? null, createdAt: u.createdAt,
});
export const placeOut = (p: Place) => ({ id: p.id, campusId: p.campusId, name: p.name, category: p.category, lat: p.lat, lng: p.lng, photoUrl: p.photoUrl, description: p.description });
export const organizerOut = (o: Organizer) => ({ id: o.id, name: o.name, logoUrl: o.logoUrl, description: o.description, contact: o.contact, faculty: o.faculty });
export const pinOut = (p: Pin) => ({ id: p.id, eventId: p.eventId, label: p.label, category: p.category, lat: p.lat, lng: p.lng, type: p.type, startAt: p.startAt, endAt: p.endAt, status: pinStatus(p) });

type FullEvent = Event & { place: Place; organizer: Organizer; facilities: { place: Place }[]; _count?: { registrations: number } };
export const eventInclude = { place: true, organizer: true, facilities: { include: { place: true } }, _count: { select: { registrations: true } } } as const;
export function eventOut(e: FullEvent, extra: { registered?: boolean } = {}) {
  let speakers: string[] = [];
  try { speakers = JSON.parse(e.speakers); } catch {}
  return {
    id: e.id, name: e.name, description: e.description, posterUrl: e.posterUrl, faculty: e.faculty, startAt: e.startAt, endAt: e.endAt,
    speakers, status: eventStatus(e), placeId: e.placeId, place: placeOut(e.place), organizerId: e.organizerId,
    organizer: { id: e.organizer.id, name: e.organizer.name, logoUrl: e.organizer.logoUrl },
    facilities: e.facilities.map((f) => placeOut(f.place)), registrantCount: e._count?.registrations ?? 0, ...extra,
  };
}
