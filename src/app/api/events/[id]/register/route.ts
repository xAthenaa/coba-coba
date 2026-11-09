import { db } from "@/server/db";
import { ApiError, E, noContent, ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";

type P = { id: string };
export const POST = route<P>(async (_r, { id }) => {
  const u = await requireUser("VISITOR");
  const ev = await db.event.findUnique({ where: { id } });
  if (!ev) throw E.notFound("Event tidak ditemukan");
  if (ev.endAt <= new Date()) throw E.bad("EVENT_ENDED", "Event sudah selesai");
  const exist = await db.registration.findUnique({ where: { userId_eventId: { userId: u.id, eventId: id } } });
  if (exist) throw E.conflict("Kamu sudah terdaftar di event ini");
  // Cek kuota & simpan dalam satu transaksi (SQLite menserialkan penulisan).
  const r = await db.$transaction(async (tx) => {
    if (ev.quota != null && (await tx.registration.count({ where: { eventId: id } })) >= ev.quota)
      throw new ApiError(409, "EVENT_FULL", "Kuota peserta event ini sudah penuh");
    return tx.registration.create({ data: { userId: u.id, eventId: id } });
  });
  return ok({ eventId: id, registeredAt: r.createdAt }, 201);
});
export const DELETE = route<P>(async (_r, { id }) => {
  const u = await requireUser("VISITOR");
  if (!(await db.event.findUnique({ where: { id } }))) throw E.notFound("Event tidak ditemukan");
  const r = await db.registration.deleteMany({ where: { userId: u.id, eventId: id } });
  if (!r.count) throw E.notFound("Kamu belum terdaftar di event ini");
  return noContent();
});
