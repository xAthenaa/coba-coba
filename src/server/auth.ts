import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { db } from "./db";
import { E } from "./http";

export const COOKIE = "wayo_session";
export const ROLE_COOKIE = "wayo_role"; // petunjuk UI/middleware saja; otorisasi tetap di server
const WEEK = 7 * 24 * 3600;
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function startSession(res: NextResponse, user: User) {
  const token = randomBytes(32).toString("hex");
  await db.session.create({ data: { tokenHash: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + WEEK * 1000) } });
  const base = { sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: WEEK };
  res.cookies.set(COOKIE, token, { ...base, httpOnly: true });
  res.cookies.set(ROLE_COOKIE, user.role, { ...base, httpOnly: false });
  return res;
}
export function clearCookies(res: NextResponse) {
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(ROLE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function currentToken() { return (await cookies()).get(COOKIE)?.value; }

export async function getUser() {
  const token = await currentToken();
  if (!token) return null;
  const s = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: { include: { organizer: true } } } });
  if (!s) return null;
  if (s.expiresAt < new Date()) { await db.session.delete({ where: { id: s.id } }).catch(() => {}); return null; }
  return s.user;
}
export type AuthUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

export async function requireUser(role?: "VISITOR" | "ORGANIZER") {
  const u = await getUser();
  if (!u) throw E.unauth();
  if (role && u.role !== role) throw E.forbidden(role === "ORGANIZER" ? "Hanya untuk panitia" : "Hanya untuk pengunjung");
  return u;
}
export async function requireOrganizer() {
  const u = await requireUser("ORGANIZER");
  if (!u.organizer) throw E.forbidden("Akun panitia belum punya penyelenggara");
  return { user: u, organizer: u.organizer };
}
