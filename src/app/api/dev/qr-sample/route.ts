import { db } from "@/server/db";
import { E, ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";

/**
 * Khusus demo/prototipe: kode QR valid untuk tombol "Simulasi scan" (tanpa kamera).
 * Aktif hanya bila WAYO_DEMO=1 (lihat .env.example). Matikan di produksi.
 */
export const GET = route(async () => {
  if (process.env.WAYO_DEMO !== "1") throw E.notFound();
  await requireUser();
  const qr = await db.qrMap.findFirst({ where: { event: { endAt: { gt: new Date() } } }, include: { event: true }, orderBy: { event: { startAt: "asc" } } });
  if (!qr) throw E.notFound("Tidak ada event aktif");
  return ok({ code: qr.code, name: qr.event.name });
});
