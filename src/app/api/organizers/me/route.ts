import { db } from "@/server/db";
import { E, ok, readJson, route } from "@/server/http";
import { requireOrganizer } from "@/server/auth";
import { organizerOut } from "@/server/serialize";
import { REQ, isStr, strOrNull } from "@/server/validate";
export const GET = route(async () => ok(organizerOut((await requireOrganizer()).organizer)));
export const PATCH = route(async (req) => {
  const { organizer } = await requireOrganizer();
  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  if ("name" in b) { if (!isStr(b.name)) throw E.validation({ name: REQ }); data.name = b.name.trim(); }
  for (const k of ["description", "contact", "faculty"] as const) if (k in b) data[k] = typeof b[k] === "string" ? (b[k] as string).trim() : "";
  if ("logoUrl" in b) data.logoUrl = strOrNull(b.logoUrl);
  return ok(organizerOut(await db.organizer.update({ where: { id: organizer.id }, data })));
});
