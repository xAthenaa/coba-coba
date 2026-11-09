import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { startSession } from "@/server/auth";
import { OAUTH_COOKIE, decodeState, exchangeCode, googleConfigured } from "@/server/google";

const home = (role: string) => (role === "ADMIN" ? "/admin" : role === "ORGANIZER" ? "/panitia" : "/home");

/** Callback OAuth Google: verifikasi state, tukar code → profil, lalu masuk / daftar. Akun ADMIN tidak pernah dibuat lewat Google. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const st = decodeState(req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${OAUTH_COOKIE}=`))?.slice(OAUTH_COOKIE.length + 1));
  const back = st?.mode === "daftar" ? "/daftar" : "/login";
  const go = (path: string) => {
    const res = NextResponse.redirect(new URL(path, req.url));
    res.cookies.set(OAUTH_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return res;
  };
  if (!googleConfigured()) return go(`${back}?google=off`);
  if (u.searchParams.get("error")) return go(`${back}?google=batal`);
  const code = u.searchParams.get("code");
  if (!st || !code || u.searchParams.get("state") !== st.state) return go(`${back}?google=gagal`);
  let p;
  try { p = await exchangeCode(code, req); } catch (e) { console.error("[WAYO] Google OAuth:", e); return go(`${back}?google=gagal`); }
  if (!(p.email_verified === true || p.email_verified === "true")) return go(`${back}?google=belum-verifikasi`);
  const email = p.email.trim().toLowerCase();
  let user = await db.user.findUnique({ where: { googleId: p.sub }, include: { organizer: true } })
    ?? await db.user.findUnique({ where: { email }, include: { organizer: true } });
  if (user) {
    if (!user.active) return go(`${back}?google=nonaktif`);
    if (!user.googleId) user = await db.user.update({ where: { id: user.id }, data: { googleId: p.sub }, include: { organizer: true } });
    else if (user.googleId !== p.sub) return go(`${back}?google=gagal`);
    return startSession(go(st.next ?? home(user.role)), user);
  }
  // Akun baru: peran wajib dipilih di halaman Daftar.
  if (st.mode !== "daftar" || !st.role) return go(`/daftar?google=baru&email=${encodeURIComponent(email)}`);
  const name = (p.name || email.split("@")[0]).trim().slice(0, 100);
  const created = await db.user.create({
    data: {
      name, email, googleId: p.sub, role: st.role, passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
      avatarUrl: typeof p.picture === "string" ? p.picture : null,
      ...(st.role === "ORGANIZER" ? { organizer: { create: { name } } } : {}),
    },
    include: { organizer: true },
  });
  return startSession(go(st.role === "ORGANIZER" ? "/panitia" : "/izin-lokasi"), created);
}
