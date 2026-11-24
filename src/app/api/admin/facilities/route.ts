import { db } from "@/server/db";
import { ok, readJson, route } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { facilityOut } from "@/server/serialize";
import { validateFacility } from "@/server/rules";

/** Data master fasilitas (Admin). */
export const GET = route(async () => {
  await requireAdmin();
  return ok((await db.facility.findMany({ include: { place: true }, orderBy: { name: "asc" } })).map(facilityOut));
});
export const POST = route(async (req) => {
  await requireAdmin();
  const v = await validateFacility(await readJson(req));
  return ok(facilityOut(await db.facility.create({ data: v, include: { place: true } })), 201);
});
