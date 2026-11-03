import { db } from "@/server/db";
import { E, ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { eventInclude, eventOut } from "@/server/serialize";

export const GET = route(async (req) => {
  const u = await requireUser();
  const tab = new URL(req.url).searchParams.get("tab") ?? "terdaftar";
  if (tab !== "terdaftar" && tab !== "terlewati") throw E.validation({ tab: "Harus terdaftar atau terlewati" });
  const now = new Date();
  const regs = await db.registration.findMany({
    where: { userId: u.id, event: tab === "terdaftar" ? { endAt: { gt: now } } : { endAt: { lte: now } } },
    include: { event: { include: eventInclude } },
    orderBy: { event: { startAt: tab === "terdaftar" ? "asc" : "desc" } },
  });
  return ok(regs.map((r) => ({ registeredAt: r.createdAt, ...eventOut(r.event, { registered: true }) })));
});
