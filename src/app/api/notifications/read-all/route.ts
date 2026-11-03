import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
export const POST = route(async () => {
  const u = await requireUser();
  const r = await db.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
  return ok({ updated: r.count });
});
