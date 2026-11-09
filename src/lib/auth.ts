"use client";
/** Sesi dari server (cookie httpOnly `wayo_session`) dibaca lewat GET /api/me. Tidak ada mode tamu. Peran: pengunjung | panitia | admin. */
import useSWR, { mutate } from "swr";
import { api, ApiError } from "./api";

export type Role = "pengunjung" | "panitia" | "admin";
export const roleHome = (r: Role) => (r === "admin" ? "/admin" : r === "panitia" ? "/panitia" : "/home");
export interface Session { userId: string; role: Role; name: string; email: string; organizerId: string | null; phone: string | null; faculty: string | null; defaultCampusId: string }
type Me = { id: string; role: string; name: string; email: string; organizerId: string | null; phone: string | null; faculty: string | null; defaultCampusId: string };
const toSession = (u: Me): Session => ({ userId: u.id, role: u.role === "ADMIN" ? "admin" : u.role === "ORGANIZER" ? "panitia" : "pengunjung", name: u.name, email: u.email, organizerId: u.organizerId, phone: u.phone, faculty: u.faculty, defaultCampusId: u.defaultCampusId });

async function meFetcher(): Promise<Session | null> {
  try { return toSession(await api<Me>("/api/me")); } catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e; }
}
/** undefined saat memuat, null bila belum login */
export function useSession(): Session | null | undefined {
  const { data } = useSWR("/api/me", meFetcher, { revalidateOnFocus: false });
  return data;
}
export async function login(email: string, password: string) {
  const u = toSession(await api<Me>("/api/auth/login", { method: "POST", body: { email, password } }));
  await mutate(() => true, undefined, { revalidate: false }); // buang cache user sebelumnya
  await mutate("/api/me", u, false);
  return u;
}
export async function register(body: { name: string; email: string; password: string; role: "VISITOR" | "ORGANIZER"; organizerName?: string }) {
  const u = toSession(await api<Me>("/api/auth/register", { method: "POST", body }));
  await mutate(() => true, undefined, { revalidate: false });
  await mutate("/api/me", u, false);
  return u;
}
export async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } finally {
    // Cache klien tetap dibersihkan; galat server tetap dilempar ke pemanggil.
    await mutate(() => true, undefined, { revalidate: false });
    await mutate("/api/me", null, false);
  }
}
export const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/** Lupa password → email tautan atur ulang (respons selalu sama). */
export const requestReset = (email: string) => api<{ message: string }>("/api/auth/forgot", { method: "POST", body: { email } });
export const checkResetToken = (token: string) => api<{ valid: boolean }>(`/api/auth/reset?token=${encodeURIComponent(token)}`);
export async function resetPassword(token: string, password: string) {
  const r = await api<{ message: string }>("/api/auth/reset", { method: "POST", body: { token, password } });
  await mutate(() => true, undefined, { revalidate: false });
  await mutate("/api/me", null, false);
  return r;
}
/** URL mulai OAuth Google. */
export const googleUrl = (mode: "login" | "daftar", role?: "VISITOR" | "ORGANIZER", next?: string | null) =>
  `/api/auth/google?${new URLSearchParams({ mode, ...(role ? { role } : {}), ...(next ? { next } : {}) })}`;
export const googleStatus = () => api<{ configured: boolean }>("/api/auth/google/status");
