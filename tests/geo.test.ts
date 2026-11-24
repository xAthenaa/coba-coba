/** Tes keputusan rute 'cara 1' (garis lurus dalam kampus bila OSRM memutar). Jalankan: npx tsx tests/geo.test.ts */
import { CAMPUS_DETOUR_RATIO, CAMPUS_STRAIGHT_MAX_M, distance, maybeCampusStraight, shouldUseCampusStraight } from "../src/lib/geo";
import type { LatLng } from "../src/lib/types";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, info?: unknown) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${info !== undefined ? "  → " + JSON.stringify(info) : ""}`); }
}

const a: LatLng = { lat: -8.6724, lng: 115.2187 };
const east200: LatLng = { lat: -8.6724, lng: 115.2187 + 200 / (111_320 * Math.cos((-8.6724 * Math.PI) / 180)) };
const north600: LatLng = { lat: -8.6724 + 600 / 111_320, lng: 115.2187 };
const detourVia = (from: LatLng, to: LatLng, via: LatLng): LatLng[] => [from, via, to];

console.log("\ngeo: shouldUseCampusStraight / maybeCampusStraight");
check("ambang terpusat di geo.ts", CAMPUS_STRAIGHT_MAX_M === 500 && CAMPUS_DETOUR_RATIO === 2.5);
check("contoh jarak lurus ~200 m", (() => { const d = distance(a, east200); return d > 190 && d < 210; })(), Math.round(distance(a, east200)));

check("200 m lurus, rute 600 m (>2,5×) → garis lurus", shouldUseCampusStraight(200, 600) === true);
check("200 m lurus, rute 400 m (<2,5×) → tetap rute", shouldUseCampusStraight(200, 400) === false);
check("tepat 2,5× tidak diganti", shouldUseCampusStraight(200, 500) === false);
check("499 m lurus, rute >2,5× → garis lurus", shouldUseCampusStraight(499, 499 * 2.5 + 1) === true);
check("500 m lurus tidak masuk ambang (< 500)", shouldUseCampusStraight(500, 2000) === false);
check("501 m lurus tidak diganti meski memutar", shouldUseCampusStraight(501, 5000) === false);
check("jarak 0 tidak diganti", shouldUseCampusStraight(0, 100) === false);
check("rute lebih pendek dari lurus tidak diganti", shouldUseCampusStraight(200, 100) === false);

const long = detourVia(a, east200, { lat: a.lat + 0.01, lng: a.lng }); // ~1 km ke utara lalu ke tujuan
const chosen = maybeCampusStraight(a, east200, long);
check("maybeCampusStraight: rute memutar diganti 2 titik start→tujuan", chosen.campusStraight === true && chosen.route.length === 2 && chosen.route[0] === a && chosen.route[1] === east200);

const direct = [a, east200];
const keep = maybeCampusStraight(a, east200, direct);
check("maybeCampusStraight: rute wajar (≈ jarak lurus) dipertahankan", keep.campusStraight === false && keep.route === direct);

const farDetour = detourVia(a, north600, { lat: a.lat, lng: a.lng + 0.02 });
const farChoice = maybeCampusStraight(a, north600, farDetour);
check("jarak lurus ≥ 500 m: rute OSRM tetap dipakai", distance(a, north600) >= 500 && farChoice.campusStraight === false && farChoice.route === farDetour);

console.log(`\n${pass} lulus, ${fail} gagal`);
if (fail) process.exit(1);
