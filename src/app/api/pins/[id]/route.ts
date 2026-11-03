import { db } from "@/server/db";
import { E, noContent, ok, readJson, route } from "@/server/http";
import { requireUser, type AuthUser } from "@/server/auth";
import { pinOut, pinStatus } from "@/server/serialize";
import { ownedEvent, validatePin } from "@/server/rules";

type P = { id: string };
async function ownedPin(id: string, u: AuthUser) {
  const p = await db.pin.findUnique({ where: { id } });
  if (!p) throw E.notFound("Pin tidak ditemukan");
  await ownedEvent(p.eventId, u);
  return p;
}
export const GET = route<P>(async (_r, { id }) => {
  const u = await requireUser();
  const p = await db.pin.findUnique({ where: { id }, include: { event: true } });
  if (!p) throw E.notFound("Pin tidak ditemukan");
  const owner = u.organizer?.id === p.event.organizerId;
  if (!owner && pinStatus(p) !== "ACTIVE") throw E.notFound("Pin tidak ditemukan");
  return ok(pinOut(p));
});
export const PATCH = route<P>(async (req, { id }) => {
  const u = await requireUser();
  const p = await ownedPin(id, u);
  const v = validatePin(await readJson(req), p);
  return ok(pinOut(await db.pin.update({ where: { id }, data: v })));
});
export const DELETE = route<P>(async (_r, { id }) => {
  const u = await requireUser();
  await ownedPin(id, u);
  await db.pin.delete({ where: { id } });
  return noContent();
});
