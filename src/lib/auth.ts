"use client";
/** Sesi dari server (cookie httpOnly `wayo_session`) dibaca lewat GET /api/me. Tidak ada mode tamu. */
import useSWR, { mutate } from "swr";
import { api, ApiError } from "./api";

export type Role = "pengunjung" | "panitia";
export interface Session { userId: string; role: Role; name: string; email: string; organizerId: string | null; phone: string | null; faculty: string | null; defaultCampusId: string }
type Me = { id: string; role: string; name: string; email: string; organizerId: string | null; phone: string | null; faculty: string | null; defaultCampusId: string };
const toSession = (u: Me): Session => ({ userId: u.id, role: u.role === "ORGANIZER" ? "panitia" : "pengunjung", name: u.name, email: u.email, organizerId: u.organizerId, phone: u.phone, faculty: u.faculty, defaultCampusId: u.defaultCampusId });

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
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  await mutate(() => true, undefined, { revalidate: false });
  await mutate("/api/me", null, false);
}
export const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
