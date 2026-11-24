import { db } from "@/server/db";
import { E, noContent, ok, readJson, route } from "@/server/http";
import { requireUser, type AuthUser } from "@/server/auth";
import { scheduleOut } from "@/server/serialize";
import { ownedEvent, validateSchedule } from "@/server/rules";

type P = { id: string; itemId: string };
async function ownedItem(id: string, itemId: string, u: AuthUser) {
  await ownedEvent(id, u);
  const it = await db.eventSchedule.findUnique({ where: { id: itemId } });
  if (!it || it.eventId !== id) throw E.notFound("Item jadwal tidak ditemukan");
  return it;
}
export const PATCH = route<P>(async (req, { id, itemId }) => {
  const u = await requireUser();
  const it = await ownedItem(id, itemId, u);
  const v = validateSchedule(await readJson(req), it);
  return ok(scheduleOut(await db.eventSchedule.update({ where: { id: itemId }, data: v })));
});
export const DELETE = route<P>(async (_r, { id, itemId }) => {
  const u = await requireUser();
  await ownedItem(id, itemId, u);
  await db.eventSchedule.delete({ where: { id: itemId } });
  return noContent();
});
