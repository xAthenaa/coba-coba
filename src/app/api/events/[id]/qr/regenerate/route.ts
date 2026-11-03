import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { ownedEvent } from "@/server/rules";
import { baseUrl, ensureQr, qrCode } from "@/server/qr";

export const POST = route<{ id: string }>(async (req, { id }) => {
  const u = await requireUser();
  const ev = await ownedEvent(id, u);
  await ensureQr(id, ev.placeId);
  const qr = await db.qrMap.update({ where: { eventId: id }, data: { code: qrCode(), regeneratedAt: new Date() } });
  return ok({ code: qr.code, url: `${baseUrl(req)}/q/${qr.code}`, createdAt: qr.createdAt, regeneratedAt: qr.regeneratedAt });
});
