export const toLocalInput = (iso?: string) => (iso ? new Date(new Date(iso).getTime() + 8 * 3600e3).toISOString().slice(0, 16) : "");
export const fromLocalInput = (v: string) => (v ? `${v}:00+08:00` : "");
