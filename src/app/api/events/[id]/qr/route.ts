import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { ownedEvent } from "@/server/rules";
import { baseUrl, ensureQr } from "@/server/qr";
export const GET = route<{ id: string }>(async (req, { id }) => {
  const u = await requireUser();
  const ev = await ownedEvent(id, u);
  const qr = await ensureQr(id, ev.placeId);
  return ok({ code: qr.code, url: `${baseUrl(req)}/q/${qr.code}`, createdAt: qr.createdAt, regeneratedAt: qr.regeneratedAt });
});
