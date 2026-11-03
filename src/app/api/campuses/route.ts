import { db } from "@/server/db";
import { ok, route } from "@/server/http";
export const GET = route(async () => {
  const cs = await db.campus.findMany({ include: { _count: { select: { places: true } } }, orderBy: { name: "desc" } });
  return ok(cs.map((c) => ({ id: c.id, name: c.name, center: { lat: c.centerLat, lng: c.centerLng }, zoom: c.zoom, placeCount: c._count.places })));
});
