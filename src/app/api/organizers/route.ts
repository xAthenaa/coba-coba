import { db } from "@/server/db";
import { ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { organizerOut } from "@/server/serialize";
export const GET = route(async (req) => {
  await requireUser();
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
  const list = await db.organizer.findMany({ include: { _count: { select: { events: true } } }, orderBy: { name: "asc" } });
  return ok(list.filter((o) => !q || o.name.toLowerCase().includes(q) || o.faculty.toLowerCase().includes(q)).map((o) => ({ ...organizerOut(o), eventCount: o._count.events })));
});
