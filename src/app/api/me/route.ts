import { db } from "@/server/db";
import { E, ok, readJson, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { userOut } from "@/server/serialize";
import { REQ, isStr, strOrNull } from "@/server/validate";

export const GET = route(async () => ok(userOut(await requireUser())));
export const PATCH = route(async (req) => {
  const u = await requireUser();
  const b = await readJson(req); // field `role`/`email` diabaikan
  const f: Record<string, string> = {};
  const data: Record<string, unknown> = {};
  if ("name" in b) { if (!isStr(b.name)) f.name = REQ; else data.name = b.name.trim(); }
  for (const k of ["phone", "faculty", "avatarUrl"] as const) if (k in b) data[k] = strOrNull(b[k]);
  if ("defaultCampusId" in b) {
    if (typeof b.defaultCampusId !== "string" || !(await db.campus.findUnique({ where: { id: b.defaultCampusId } }))) f.defaultCampusId = "Kampus tidak ditemukan";
    else data.defaultCampusId = b.defaultCampusId;
  }
  if (Object.keys(f).length) throw E.validation(f);
  const nu = await db.user.update({ where: { id: u.id }, data, include: { organizer: true } });
  return ok(userOut(nu));
});
