import { db } from "@/server/db";
import { E, noContent, route } from "@/server/http";
import { requireAdmin } from "@/server/auth";

export const DELETE = route<{ id: string }>(async (_r, { id }) => {
  await requireAdmin();
  const r = await db.registration.deleteMany({ where: { id } });
  if (!r.count) throw E.notFound("Pendaftaran tidak ditemukan");
  return noContent();
});
