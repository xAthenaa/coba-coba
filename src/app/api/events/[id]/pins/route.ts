import { db } from "@/server/db";
import { E, ok, readJson, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { pinOut, pinStatus } from "@/server/serialize";
import { ownedEvent, validatePin } from "@/server/rules";
import { notifyRegistrants } from "@/server/notify";

type P = { id: string };
export const GET = route<P>(async (_r, { id }) => {
  const u = await requireUser();
  const ev = await db.event.findUnique({ where: { id } });
  if (!ev) throw E.notFound("Event tidak ditemukan");
  const owner = u.organizer?.id === ev.organizerId;
  const pins = await db.pin.findMany({ where: { eventId: id }, orderBy: { createdAt: "asc" } });
  return ok(pins.filter((p) => owner || pinStatus(p) === "ACTIVE").map(pinOut));
});
export const POST = route<P>(async (req, { id }) => {
  const u = await requireUser();
  const ev = await ownedEvent(id, u);
  const v = validatePin(await readJson(req));
  const p = await db.pin.create({ data: { ...v, eventId: id, createdById: u.id } });
  await notifyRegistrants(id, "PIN_NEW", `Pin baru "${p.label}" ditambahkan di ${ev.name}.`, p.id);
  return ok(pinOut(p), 201);
});
