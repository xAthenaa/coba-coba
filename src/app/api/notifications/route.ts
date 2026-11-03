import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";

const SOON = 60 * 60 * 1000, EXPIRING = 30 * 60 * 1000;
/** Buat notifikasi EVENT_START / PIN_EXPIRING secara malas (tanpa cron). */
async function lazyCreate(userId: string) {
  const now = new Date();
  const regs = await db.registration.findMany({
    where: { userId, event: { startAt: { lte: new Date(now.getTime() + SOON) }, endAt: { gt: now } } },
    include: { event: { include: { pins: { where: { type: "TIMED", endAt: { gt: now, lte: new Date(now.getTime() + EXPIRING) } } } } } },
  });
  for (const { event: e } of regs) {
    if (!(await db.notification.findFirst({ where: { userId, type: "EVENT_START", eventId: e.id } })))
      await db.notification.create({ data: { userId, type: "EVENT_START", eventId: e.id, text: e.startAt <= now ? `${e.name} sedang berlangsung.` : `${e.name} dimulai kurang dari 1 jam lagi.` } });
    for (const p of e.pins) {
      if (p.startAt && p.startAt > now) continue;
      if (!(await db.notification.findFirst({ where: { userId, type: "PIN_EXPIRING", pinId: p.id } })))
        await db.notification.create({ data: { userId, type: "PIN_EXPIRING", eventId: e.id, pinId: p.id, text: `Pin "${p.label}" akan segera dihapus.` } });
    }
  }
}
export const GET = route(async () => {
  const u = await requireUser();
  await lazyCreate(u.id);
  const [items, unreadCount] = await Promise.all([
    db.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.notification.count({ where: { userId: u.id, readAt: null } }),
  ]);
  return ok({ unreadCount, items: items.map((n) => ({ id: n.id, type: n.type, text: n.text, eventId: n.eventId, pinId: n.pinId, read: !!n.readAt, createdAt: n.createdAt })) });
});
