import { db } from "@/server/db";
import { E, noContent, ok, readJson, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { eventInclude, eventOut } from "@/server/serialize";
import { ownedEvent, validateEvent } from "@/server/rules";
import { notifyRegistrants } from "@/server/notify";

type P = { id: string };
export const GET = route<P>(async (_r, { id }) => {
  const u = await requireUser();
  const e = await db.event.findUnique({ where: { id }, include: eventInclude });
  if (!e) throw E.notFound("Event tidak ditemukan");
  const reg = await db.registration.findUnique({ where: { userId_eventId: { userId: u.id, eventId: id } } });
  return ok(eventOut(e, { registered: !!reg }));
});
export const PATCH = route<P>(async (req, { id }) => {
  const u = await requireUser();
  const ev = await ownedEvent(id, u);
  const b = await readJson(req);
  const fac = await db.eventFacility.findMany({ where: { eventId: id } });
  const v = await validateEvent(b, { ...ev, speakers: JSON.parse(ev.speakers || "[]"), facilities: fac.map((f) => f.placeId) });
  const e = await db.event.update({
    where: { id },
    data: {
      placeId: v.placeId, name: v.name, description: v.description, posterUrl: v.posterUrl, faculty: v.faculty, startAt: v.startAt, endAt: v.endAt,
      speakers: JSON.stringify(v.speakers),
      ...("facilities" in b ? { facilities: { deleteMany: {}, create: v.facilities.map((placeId) => ({ placeId })) } } : {}),
    },
    include: eventInclude,
  });
  await notifyRegistrants(id, "EVENT_UPDATED", `Info event "${e.name}" diperbarui oleh panitia.`);
  return ok(eventOut(e));
});
export const DELETE = route<P>(async (_r, { id }) => {
  const u = await requireUser();
  await ownedEvent(id, u);
  await db.$transaction([db.notification.deleteMany({ where: { eventId: id } }), db.event.delete({ where: { id } })]);
  return noContent();
});
