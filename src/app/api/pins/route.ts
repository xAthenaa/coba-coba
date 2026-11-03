import { db } from "@/server/db";
import { E, ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { activePinWhere, pinOut } from "@/server/serialize";
import { CATEGORIES, asEnum } from "@/server/validate";
/** Semua pin yang sedang aktif (untuk peta pengunjung). ?eventId & ?category opsional. */
export const GET = route(async (req) => {
  await requireUser();
  const sp = new URL(req.url).searchParams;
  const eventId = sp.get("eventId");
  let category: string | null = null;
  if (sp.get("category")) { category = asEnum(sp.get("category"), CATEGORIES); if (!category) throw E.validation({ category: "Kategori tidak dikenal" }); }
  const pins = await db.pin.findMany({ where: { ...activePinWhere(), ...(eventId ? { eventId } : {}), ...(category ? { category } : {}) }, orderBy: { createdAt: "asc" } });
  return ok(pins.map(pinOut));
});
