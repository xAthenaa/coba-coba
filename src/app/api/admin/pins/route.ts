import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { pinOut } from "@/server/serialize";

/** Semua pin (termasuk terjadwal/kedaluwarsa) untuk pengawasan Admin. Hapus lewat DELETE /api/pins/[id]. */
export const GET = route(async () => {
  await requireAdmin();
  const pins = await db.pin.findMany({ include: { event: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } });
  return ok(pins.map((p) => ({ ...pinOut(p), event: p.event })));
});
