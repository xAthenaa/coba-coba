/** Isi QR Peta (api-spec): URL `<BASE_URL>/q/<code>`. Input manual menerima URL tsb atau kode saja. */
export function parseQrCode(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const m = t.match(/\/q\/([^/?#\s]+)/);
  if (m) return decodeURIComponent(m[1]);
  return /^[A-Za-z0-9_-]{4,64}$/.test(t) ? t : null;
}
