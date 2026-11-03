import { db } from "@/server/db";
import { E, ok, route, readJson } from "@/server/http";
import { requireOrganizer, requireUser } from "@/server/auth";
import { eventInclude, eventOut, eventStatus } from "@/server/serialize";
import { validateEvent } from "@/server/rules";
import { qrCode } from "@/server/qr";


export const GET = route(async (req) => {
  const u = await requireUser();
  const sp = new URL(req.url).searchParams;
  const where: Record<string, unknown> = {};
  if (sp.get("mine") === "1" || sp.get("mine") === "true") where.organizerId = u.organizer?.id ?? "__none__";
  if (sp.get("organizerId")) where.organizerId = sp.get("organizerId");
  if (sp.get("faculty")) where.faculty = sp.get("faculty");
  if (sp.get("campusId")) where.place = { campusId: sp.get("campusId") };
  const q = sp.get("q")?.trim().toLowerCase();
  const ALIAS: Record<string, string> = { AKTIF: "ONGOING", BERLANGSUNG: "ONGOING", "AKAN-DATANG": "UPCOMING", "AKAN DATANG": "UPCOMING", SELESAI: "ENDED" };
  const rawStatus = sp.get("status")?.toUpperCase();
  const status = rawStatus ? ALIAS[rawStatus] ?? rawStatus : undefined;
  if (status && !["ONGOING", "UPCOMING", "ENDED"].includes(status)) throw E.validation({ status: "Status tidak dikenal" });
  const [events, regs] = await Promise.all([
    db.event.findMany({ where, include: eventInclude, orderBy: { startAt: "asc" } }),
    db.registration.findMany({ where: { userId: u.id }, select: { eventId: true } }),
  ]);
  const mine = new Set(regs.map((r) => r.eventId));
  return ok(events
    .filter((e) => (!q || e.name.toLowerCase().includes(q) || e.organizer.name.toLowerCase().includes(q)) && (!status || eventStatus(e) === status))
    .map((e) => eventOut(e, { registered: mine.has(e.id) })));
});

export const POST = route(async (req) => {
  const { organizer } = await requireOrganizer();
  const v = await validateEvent(await readJson(req));
  const e = await db.event.create({
    data: {
      organizerId: organizer.id, placeId: v.placeId, name: v.name, description: v.description, posterUrl: v.posterUrl, faculty: v.faculty,
      startAt: v.startAt, endAt: v.endAt, speakers: JSON.stringify(v.speakers),
      facilities: { create: v.facilities.map((placeId) => ({ placeId })) },
      qr: { create: { code: qrCode(), targetPlaceId: v.placeId } },
    },
    include: eventInclude,
  });
  return ok(eventOut(e, { registered: false }), 201);
});
