import { db } from "@/server/db";
import { E, ok, readJson, route } from "@/server/http";
import { NextResponse } from "next/server";
import { clearCookies, getUser, requireUser } from "@/server/auth";
import { userOut } from "@/server/serialize";
import { REQ, isEmail, isStr, strOrNull } from "@/server/validate";

export const GET = route(async () => {
  const u = await getUser(); // validasi token ke tabel Session (ada & belum kedaluwarsa)
  if (!u) return clearCookies(NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Silakan masuk terlebih dahulu" } }, { status: 401 }));
  return ok(userOut(u));
});
export const PATCH = route(async (req) => {
  const u = await requireUser();
  const b = await readJson(req); // field `role` diabaikan
  const f: Record<string, string> = {};
  const data: Record<string, unknown> = {};
  if ("name" in b) { if (!isStr(b.name)) f.name = REQ; else data.name = b.name.trim(); }
  for (const k of ["phone", "faculty", "avatarUrl"] as const) if (k in b) data[k] = strOrNull(b[k]);
  if ("email" in b) {
    if (!isEmail(b.email)) f.email = "Format email tidak valid";
    else {
      const email = b.email.trim().toLowerCase();
      const other = await db.user.findUnique({ where: { email } });
      if (other && other.id !== u.id) throw E.conflict("Email sudah dipakai akun lain");
      data.email = email;
    }
  }
  if ("defaultCampusId" in b) {
    if (typeof b.defaultCampusId !== "string" || !(await db.campus.findUnique({ where: { id: b.defaultCampusId } }))) f.defaultCampusId = "Kampus tidak ditemukan";
    else data.defaultCampusId = b.defaultCampusId;
  }
  if (Object.keys(f).length) throw E.validation(f);
  const nu = await db.user.update({ where: { id: u.id }, data, include: { organizer: true } });
  return ok(userOut(nu));
});
