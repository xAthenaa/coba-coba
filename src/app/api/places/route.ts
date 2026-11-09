import { db } from "@/server/db";
import { E, ok, readJson, route } from "@/server/http";
import { requireAdmin, requireUser } from "@/server/auth";
import { validatePlace } from "@/server/rules";
import { placeOut } from "@/server/serialize";
import { haversineM, walkMin } from "@/server/geo";
import { CATEGORIES, asEnum } from "@/server/validate";

export const GET = route(async (req) => {
  await requireUser();
  const sp = new URL(req.url).searchParams;
  const where: Record<string, unknown> = {};
  if (sp.get("campusId")) where.campusId = sp.get("campusId");
  if (sp.get("category")) {
    const c = asEnum(sp.get("category"), CATEGORIES);
    if (!c) throw E.validation({ category: "Kategori tidak dikenal" });
    where.category = c;
  }
  const q = sp.get("q")?.trim().toLowerCase();
  let list = (await db.place.findMany({ where, orderBy: { name: "asc" } })).map(placeOut);
  if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
  const lat = sp.get("lat"), lng = sp.get("lng");
  if (lat !== null || lng !== null || sp.get("sort") === "nearest") {
    const la = Number(lat), ln = Number(lng);
    if (lat === null || lng === null || !Number.isFinite(la) || !Number.isFinite(ln))
      throw E.validation({ ...(lat === null || !Number.isFinite(la) ? { lat: "Wajib diisi (angka)" } : {}), ...(lng === null || !Number.isFinite(ln) ? { lng: "Wajib diisi (angka)" } : {}) });
    return ok(list.map((p) => { const d = Math.round(haversineM({ lat: la, lng: ln }, p)); return { ...p, distanceM: d, walkMin: walkMin(d) }; }).sort((a, b) => a.distanceM - b.distanceM));
  }
  return ok(list);
});

/** Tambah tempat (data master) — Admin saja. */
export const POST = route(async (req) => {
  await requireAdmin();
  const v = await validatePlace(await readJson(req));
  return ok(placeOut(await db.place.create({ data: v })), 201);
});
