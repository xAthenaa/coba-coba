import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ApiError, E, ok, readJson, route } from "@/server/http";
import { clearCookies, sha256 } from "@/server/auth";

const invalid = () => new ApiError(400, "INVALID_TOKEN", "Tautan atur ulang tidak valid atau sudah kedaluwarsa. Minta tautan baru.");
async function findToken(token: unknown) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
  const t = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!t || t.usedAt || t.expiresAt <= new Date() || !t.user.active) return null;
  return t;
}
/** GET ?token= → { valid } (untuk halaman /atur-ulang-password). */
export const GET = route(async (req) => ok({ valid: !!(await findToken(new URL(req.url).searchParams.get("token"))) }));
/** POST { token, password } → ganti kata sandi, token dipakai (sekali), semua sesi pengguna dicabut. */
export const POST = route(async (req) => {
  const b = await readJson(req);
  if (typeof b.password !== "string" || !b.password) throw E.validation({ password: "Wajib diisi" });
  if (b.password.length < 8) throw E.validation({ password: "Minimal 8 karakter" });
  const t = await findToken(b.token);
  if (!t) throw invalid();
  const passwordHash = await bcrypt.hash(b.password, 10);
  const used = await db.$transaction(async (tx) => {
    const r = await tx.passwordResetToken.updateMany({ where: { id: t.id, usedAt: null }, data: { usedAt: new Date() } });
    if (!r.count) return false; // dipakai bersamaan
    await tx.user.update({ where: { id: t.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: t.userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId: t.userId, usedAt: null } });
    return true;
  });
  if (!used) throw invalid();
  return clearCookies(NextResponse.json({ data: { message: "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru." } }));
});
