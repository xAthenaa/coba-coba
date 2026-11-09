import { db } from "@/server/db";
import { E, noContent, ok, readJson, route } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { facilityOut } from "@/server/serialize";
import { validateFacility } from "@/server/rules";

type P = { id: string };
async function get(id: string) {
  const f = await db.facility.findUnique({ where: { id }, include: { place: true } });
  if (!f) throw E.notFound("Fasilitas tidak ditemukan");
  return f;
}
export const GET = route<P>(async (_r, { id }) => { await requireAdmin(); return ok(facilityOut(await get(id))); });
export const PATCH = route<P>(async (req, { id }) => {
  await requireAdmin();
  const f = await get(id);
  const v = await validateFacility(await readJson(req), f);
  return ok(facilityOut(await db.facility.update({ where: { id }, data: v, include: { place: true } })));
});
export const DELETE = route<P>(async (_r, { id }) => {
  await requireAdmin();
  await get(id);
  await db.facility.delete({ where: { id } });
  return noContent();
});
