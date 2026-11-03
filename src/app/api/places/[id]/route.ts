import { db } from "@/server/db";
import { E, ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { placeOut } from "@/server/serialize";
export const GET = route<{ id: string }>(async (_req, { id }) => {
  await requireUser();
  const p = await db.place.findUnique({ where: { id } });
  if (!p) throw E.notFound("Tempat tidak ditemukan");
  return ok(placeOut(p));
});
