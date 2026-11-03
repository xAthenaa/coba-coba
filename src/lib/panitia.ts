import { users } from "./data";
/** Organizer milik akun panitia demo (users.json → organizerId). */
export const myOrganizerId = (email?: string) => users.find((u) => u.email === email)?.organizerId ?? "org-ft";
export const toLocalInput = (iso?: string) => (iso ? new Date(new Date(iso).getTime() + 8 * 3600e3).toISOString().slice(0, 16) : "");
export const fromLocalInput = (v: string) => (v ? `${v}:00+08:00` : "");
