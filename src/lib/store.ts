"use client";
/** Penyimpanan lokal (localStorage) untuk perubahan panitia & pendaftaran event. Tanpa backend. */
import { useCallback, useSyncExternalStore } from "react";
import { baseEvents, basePins, users } from "./data";
import type { Pin, WEvent } from "./types";

interface DB { events: WEvent[]; pins: Pin[]; registered: string[]; profile: { name: string; email: string; photo: boolean } | null }
const KEY = "wayo-db-v1";
const listeners = new Set<() => void>();
let cache: DB | null = null;

function initial(): DB {
  return { events: baseEvents, pins: basePins, registered: [...(users[0].registeredEvents ?? [])], profile: null };
}
function read(): DB {
  if (cache) return cache;
  if (typeof window === "undefined") return initial();
  try { const raw = localStorage.getItem(KEY); cache = raw ? (JSON.parse(raw) as DB) : initial(); } catch { cache = initial(); }
  return cache;
}
const serverSnap = initial();
export function writeDB(fn: (d: DB) => DB) {
  cache = fn(read());
  localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}
export function resetDB() { cache = initial(); localStorage.removeItem(KEY); listeners.forEach((l) => l()); }

export function useDB(): DB {
  return useSyncExternalStore(
    useCallback((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, []),
    read,
    () => serverSnap,
  );
}
