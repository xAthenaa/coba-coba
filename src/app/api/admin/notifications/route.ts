import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireAdmin } from "@/server/auth";

/** Semua notifikasi (Admin). */
export const GET = route(async () => {
  await requireAdmin();
  const list = await db.notification.findMany({ include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
  return ok(list.map((n) => ({ id: n.id, type: n.type, text: n.text, eventId: n.eventId, pinId: n.pinId, read: !!n.readAt, createdAt: n.createdAt, user: n.user })));
});
