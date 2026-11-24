import { db } from "@/server/db";
import { ApiError, E, noContent, ok, readJson, route } from "@/server/http";
import { requireAdmin, requireUser } from "@/server/auth";
import { placeOut } from "@/server/serialize";
import { validatePlace } from "@/server/rules";

type P = { id: string };
export const GET = route<P>(async (_req, { id }) => {
  await requireUser();
  const p = await db.place.findUnique({ where: { id } });
  if (!p) throw E.notFound("Tempat tidak ditemukan");
  return ok(placeOut(p));
});
/** Ubah tempat — Admin saja. */
export const PATCH = route<P>(async (req, { id }) => {
  await requireAdmin();
  const p = await db.place.findUnique({ where: { id } });
  if (!p) throw E.notFound("Tempat tidak ditemukan");
  const v = await validatePlace(await readJson(req), p);
  return ok(placeOut(await db.place.update({ where: { id }, data: v })));
});
/** Hapus tempat — Admin saja. Ditolak (409 PLACE_IN_USE) bila masih dipakai event sebagai lokasi atau fasilitas. */
export const DELETE = route<P>(async (_req, { id }) => {
  await requireAdmin();
  const p = await db.place.findUnique({ where: { id }, include: { _count: { select: { events: true, facilityOf: true } } } });
  if (!p) throw E.notFound("Tempat tidak ditemukan");
  const { events, facilityOf } = p._count;
  if (events || facilityOf) {
    const parts = [events ? `lokasi ${events} event` : "", facilityOf ? `fasilitas ${facilityOf} event` : ""].filter(Boolean).join(" dan ");
    throw new ApiError(409, "PLACE_IN_USE", `Tempat "${p.name}" masih dipakai sebagai ${parts}. Pindahkan/hapus event tersebut terlebih dahulu.`);
  }
  await db.place.delete({ where: { id } }); // QR target & fasilitas master yang menunjuk tempat ini → null
  return noContent();
});
