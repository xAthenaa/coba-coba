"use client";
/** Login tiruan: sesi disimpan di localStorage ("wayo_session"). Peran: pengunjung | panitia | tamu. */
import { useCallback, useSyncExternalStore } from "react";

export type Role = "pengunjung" | "panitia" | "tamu";
export interface Session { userId: string; role: Role; name: string; email: string }
const KEY = "wayo_session";
const ls = new Set<() => void>();
let snap: string | null | undefined;

function get(): string | null {
  if (snap === undefined) snap = typeof window === "undefined" ? null : localStorage.getItem(KEY);
  return snap;
}
export function setSession(s: Session | null) {
  if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY);
  snap = s ? JSON.stringify(s) : null;
  ls.forEach((l) => l());
}
/** returns undefined while not hydrated, null when logged out */
export function useSession(): Session | null | undefined {
  const raw = useSyncExternalStore(
    useCallback((cb) => { ls.add(cb); return () => ls.delete(cb); }, []),
    () => get() ?? "",
    () => "__ssr__",
  );
  if (raw === "__ssr__") return undefined;
  return raw ? (JSON.parse(raw) as Session) : null;
}
export const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
