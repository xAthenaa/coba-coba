import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireAdmin } from "@/server/auth";
import { eventInclude, eventOut } from "@/server/serialize";

/** Semua event (Admin) — termasuk info surat pengajuan & kuota. Ubah/hapus lewat PATCH/DELETE /api/events/[id]. */
export const GET = route(async (req) => {
  const u = await requireAdmin();
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
  const events = await db.event.findMany({ include: eventInclude, orderBy: { startAt: "desc" } });
  return ok(events.filter((e) => !q || e.name.toLowerCase().includes(q) || e.organizer.name.toLowerCase().includes(q)).map((e) => eventOut(e, {}, u)));
});
