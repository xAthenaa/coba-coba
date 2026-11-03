import { db } from "@/server/db";
import { ApiError, ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";

export const GET = route<{ code: string }>(async (_r, { code }) => {
  await requireUser();
  const qr = await db.qrMap.findUnique({ where: { code }, include: { event: { include: { place: true } }, targetPlace: true } });
  if (!qr || qr.event.endAt <= new Date()) throw new ApiError(404, "QR_INVALID", "QR tidak valid");
  const place = qr.targetPlace ?? qr.event.place;
  return ok({ eventId: qr.eventId, placeId: place.id, lat: place.lat, lng: place.lng, campusId: place.campusId });
});
