import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireAdmin } from "@/server/auth";

/** Pengawasan pendaftaran event (Admin). ?eventId= */
export const GET = route(async (req) => {
  await requireAdmin();
  const eventId = new URL(req.url).searchParams.get("eventId");
  const regs = await db.registration.findMany({
    where: eventId ? { eventId } : {}, orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } }, event: { select: { id: true, name: true } } },
  });
  return ok(regs.map((r) => ({ id: r.id, createdAt: r.createdAt, user: r.user, event: r.event })));
});
