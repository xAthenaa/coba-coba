export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const walkMin = (m: number) => Math.ceil(m / 1.3 / 60);
