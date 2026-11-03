import { db } from "./db";
export async function notifyRegistrants(eventId: string, type: string, text: string, pinId?: string) {
  const regs = await db.registration.findMany({ where: { eventId }, select: { userId: true } });
  if (regs.length) await db.notification.createMany({ data: regs.map((r) => ({ userId: r.userId, type, text, eventId, pinId: pinId ?? null })) });
}
