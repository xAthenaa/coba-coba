import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { activePinWhere, pinOut } from "@/server/serialize";
/** Semua pin yang sedang aktif (untuk peta pengunjung). ?eventId opsional. */
export const GET = route(async (req) => {
  await requireUser();
  const eventId = new URL(req.url).searchParams.get("eventId");
  const pins = await db.pin.findMany({ where: { ...activePinWhere(), ...(eventId ? { eventId } : {}) }, orderBy: { createdAt: "asc" } });
  return ok(pins.map(pinOut));
});
