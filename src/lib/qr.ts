/** Isi QR Peta (routes.md): URL `<origin>/peta/event/<eventId>`. Juga menerima `wayo:<eventId>` atau ID event langsung (input manual). */
export const qrPayload = (origin: string, eventId: string) => `${origin}/peta/event/${encodeURIComponent(eventId)}`;
export function parseQr(text: string, eventIds: string[]): string | null {
  const t = text.trim();
  const m = t.match(/\/peta\/event\/([^/?#\s]+)/) ?? t.match(/^wayo:(.+)$/);
  const id = m ? decodeURIComponent(m[1]) : t;
  return eventIds.includes(id) ? id : null;
}
