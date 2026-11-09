import { db } from "@/server/db";
import { E, ok, readJson, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { scheduleOut } from "@/server/serialize";
import { ownedEvent, validateSchedule } from "@/server/rules";

/** Jadwal/rundown kegiatan event. GET: semua pengguna login. POST: panitia pemilik / Admin. */
type P = { id: string };
export const GET = route<P>(async (_r, { id }) => {
  await requireUser();
  if (!(await db.event.findUnique({ where: { id }, select: { id: true } }))) throw E.notFound("Event tidak ditemukan");
  const items = await db.eventSchedule.findMany({ where: { eventId: id }, orderBy: [{ startAt: "asc" }, { createdAt: "asc" }] });
  return ok(items.map(scheduleOut));
});
export const POST = route<P>(async (req, { id }) => {
  const u = await requireUser();
  await ownedEvent(id, u);
  const v = validateSchedule(await readJson(req));
  return ok(scheduleOut(await db.eventSchedule.create({ data: { ...v, eventId: id } })), 201);
});
