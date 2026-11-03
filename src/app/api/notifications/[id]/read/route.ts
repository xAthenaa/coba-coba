import { db } from "@/server/db";
import { E, ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
export const POST = route<{ id: string }>(async (_r, { id }) => {
  const u = await requireUser();
  const n = await db.notification.findUnique({ where: { id } });
  if (!n || n.userId !== u.id) throw E.notFound("Notifikasi tidak ditemukan"); // 404 agar tidak membocorkan milik orang lain
  await db.notification.update({ where: { id }, data: { readAt: n.readAt ?? new Date() } });
  return ok({ id, read: true });
});
