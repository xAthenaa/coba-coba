import { db } from "@/server/db";
import { E, ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { eventInclude, eventOut, organizerOut } from "@/server/serialize";
export const GET = route<{ id: string }>(async (_r, { id }) => {
  await requireUser();
  const o = await db.organizer.findUnique({ where: { id }, include: { events: { include: eventInclude, orderBy: { startAt: "asc" } } } });
  if (!o) throw E.notFound("Penyelenggara tidak ditemukan");
  return ok({ ...organizerOut(o), eventCount: o.events.length, events: o.events.map((e) => eventOut(e)) });
});
