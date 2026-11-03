export const ROLES = ["VISITOR", "ORGANIZER"] as const;
export const CATEGORIES = ["GEDUNG", "EVENT", "KANTIN", "TOILET", "PARKIR", "INFO", "STAND"] as const;
export const PIN_TYPES = ["TIMED", "PERMANENT"] as const;
export const NOTIF_TYPES = ["EVENT_START", "PIN_NEW", "PIN_EXPIRING", "EVENT_UPDATED"] as const;

export const REQ = "Wajib diisi";
export const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 2000;
export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export const isEmail = (v: unknown): v is string => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export function asEnum<T extends readonly string[]>(v: unknown, list: T): T[number] | null {
  if (typeof v !== "string") return null;
  const u = v.toUpperCase();
  return (list as readonly string[]).includes(u) ? (u as T[number]) : null;
}
export function asDate(v: unknown): Date | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
export const strOrNull = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
