import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathLength, distance } from "../src/lib/geo";
import {
  CAMPUS_CONNECTORS,
  campusAreaOf,
  campusRoute,
  preferCampusRoute,
  simpleSteps,
} from "../src/lib/campusRouter";
import type { LatLng } from "../src/lib/types";

const START: LatLng = { lat: -8.6720, lng: 115.2190 }; // dekat Pascasarjana / Kantin Sudirman
const FK: LatLng = { lat: -8.673441, lng: 115.21854 }; // Gedung FK (seed pl-fk)
const PASCASARJANA: LatLng = { lat: -8.6726022, lng: 115.2186603 };
const SIM_START: LatLng = { lat: -8.6728, lng: 115.2192 };
const SD_GATE: LatLng = { lat: -8.6717282, lng: 115.218262 }; // Unud Sudirman 1, Jl. P.B. Sudirman
const FEB_SD: LatLng = { lat: -8.6743148, lng: 115.2188212 };
const JB_GATE: LatLng = { lat: -8.7976237, lng: 115.171076 }; // Jalan Kampus Unud dekat Rektorat
const JB_SOUTH: LatLng = { lat: -8.800121, lng: 115.1707223 }; // gerbang selatan Jalan Kampus Unud
const REKTORAT: LatLng = { lat: -8.79822, lng: 115.17239 };
const JB_CENTER: LatLng = { lat: -8.7985, lng: 115.17 };
const FT: LatLng = { lat: -8.795838, lng: 115.176894 };
const FMIPA: LatLng = { lat: -8.799195, lng: 115.17193 };
const FEB_JB: LatLng = { lat: -8.799138, lng: 115.169123 };
const PERTANIAN: LatLng = { lat: -8.792464, lng: 115.178357 };
const GOR: LatLng = { lat: -8.794707, lng: 115.167562 }; // Stadium of Udayana University
const FH: LatLng = { lat: -8.798812, lng: 115.166679 };

/** Jarak OSRM foot terukur 2026-11-25 dari router.project-osrm.org (bukan dipanggil di tes). */
const OSRM_START_FK_M = 421.7;
const OSRM_JB_GATE_M = 276.6;
const OSRM_JB_CENTER_M = 869.2;
const OSRM_SOUTH_FT_M = 1137;
const OSRM_SOUTH_PERTANIAN_M = 1602;
const OSRM_SOUTH_FEB_M = 612;
const OSRM_SD_GATE_FK_M = 287;

describe("campusAreaOf", () => {
  it("memakai poligon OSM + margin 50 m, bukan hanya bbox longgar", () => {
    assert.equal(campusAreaOf(START), "sudirman");
    assert.equal(campusAreaOf(FK), "sudirman");
    assert.equal(campusAreaOf(FEB_SD), "sudirman");
    assert.equal(campusAreaOf(REKTORAT), "jimbaran");
    assert.equal(campusAreaOf(FT), "jimbaran");
    assert.equal(campusAreaOf(PERTANIAN), "jimbaran");
    assert.equal(campusAreaOf(GOR), "jimbaran");
    assert.equal(campusAreaOf(FH), "jimbaran");
    assert.equal(campusAreaOf({ lat: -8.65, lng: 115.21 }), null);
    assert.equal(campusAreaOf({ lat: 0, lng: 0 }), null);
    // di luar blok kampus Sudirman (perumahan di timur)
    assert.equal(campusAreaOf({ lat: -8.6725, lng: 115.2225 }), null);
    // Politeknik Negeri Bali, barat daya Jimbaran — bukan Unud
    assert.equal(campusAreaOf({ lat: -8.800132, lng: 115.162262 }), null);
  });
});

describe("campusRoute Sudirman", () => {
  it("Pascasarjana/Kantin → Gedung FK mengikuti jalur dalam kampus, bukan memutar lewat jalan umum", () => {
    const r = campusRoute(START, FK);
    assert.ok(r, "harus ada rute kampus");
    assert.equal(r!.campus, "sudirman");
    const straight = distance(START, FK);
    assert.ok(straight > 160 && straight < 175, `garis lurus ${straight}`);
    assert.ok(r!.distance > 200 && r!.distance < 300, `jarak kampus ${r!.distance}`);
    assert.ok(r!.distance < OSRM_START_FK_M);
    assert.ok(r!.distance > straight, "rute kampus harus mengikuti jalur, bukan garis lurus");
    assert.ok(r!.points.length >= 8, "bukan garis lurus 2 titik");
    assert.equal(r!.points[0].lat, START.lat);
    assert.equal(r!.points.at(-1)!.lat, FK.lat);
    for (const p of r!.points) {
      assert.ok(p.lat > -8.6737 && p.lat < -8.6717, `lat di luar koridor dalam kampus: ${p.lat}`);
      assert.ok(p.lng > 115.2182 && p.lng < 115.2192, `lng di luar koridor dalam kampus: ${p.lng}`);
    }
    const len = pathLength(r!.points);
    assert.ok(Math.abs(len - r!.distance) < 1, "distance = panjang polyline");
  });

  it("gerbang P.B. Sudirman → FK dan Pascasarjana, serta FEB, tetap terhubung", () => {
    const toFk = campusRoute(SD_GATE, FK);
    const toPps = campusRoute(SD_GATE, PASCASARJANA);
    const toFeb = campusRoute(SD_GATE, FEB_SD);
    const fromSim = campusRoute(SIM_START, FK);
    assert.ok(toFk && toFk.distance < OSRM_SD_GATE_FK_M && toFk.distance < 350);
    assert.ok(toPps && toPps.distance < 250);
    assert.ok(toFeb && toFeb.distance < 500);
    assert.ok(fromSim && fromSim.distance < OSRM_START_FK_M);
    // Fakultas Sastra / FIB tidak terpetakan di OSM Kampus Sudirman
    // (tidak ada node/way bernama Sastra/FIB di extract).
  });
});

describe("campusRoute Jimbaran (seluruh kampus)", () => {
  it("gerbang selatan Jalan Kampus Unud → FT, FMIPA, FEB, Pertanian terhubung di graf utama", () => {
    const toFt = campusRoute(JB_SOUTH, FT);
    const toFmipa = campusRoute(JB_SOUTH, FMIPA);
    const toFeb = campusRoute(JB_SOUTH, FEB_JB);
    const toFp = campusRoute(JB_SOUTH, PERTANIAN);
    assert.ok(toFt && toFt.campus === "jimbaran");
    assert.ok(toFt!.distance > 800 && toFt!.distance < 1300, `FT ${toFt!.distance}`);
    assert.ok(toFt!.distance <= OSRM_SOUTH_FT_M);
    assert.ok(toFt!.points.length >= 20, "rute lintas kampus, bukan garis lurus");
    assert.ok(toFmipa && toFmipa.distance > 150 && toFmipa.distance < 450);
    assert.ok(toFeb && toFeb.distance < OSRM_SOUTH_FEB_M);
    assert.ok(toFp && toFp.distance > 1000 && toFp.distance < 1900, `Pertanian ${toFp!.distance}`);
    assert.ok(toFp!.distance <= OSRM_SOUTH_PERTANIAN_M);
  });

  it("gerbang dekat Rektorat → Rektorat tetap terhubung; pusat kampus lebih pendek dari detour OSRM", () => {
    const r = campusRoute(JB_GATE, REKTORAT);
    assert.ok(r, "harus ada rute kampus");
    assert.equal(r!.campus, "jimbaran");
    assert.ok(r!.distance > 150 && r!.distance < 400, `jarak ${r!.distance}`);
    assert.ok(Math.abs(r!.distance - OSRM_JB_GATE_M) < 40);
    const c = campusRoute(JB_CENTER, REKTORAT);
    assert.ok(c && c.distance < OSRM_JB_CENTER_M);
  });

  it("GOR/Stadion masuk area kampus tetapi terputus di OSM (>40 m), jadi rute kampus tidak dipaksakan", () => {
    assert.equal(campusAreaOf(GOR), "jimbaran");
    const r = campusRoute(JB_SOUTH, GOR);
    assert.equal(r, null);
  });
});

describe("preferCampusRoute", () => {
  it("memilih rute kampus bila lebih pendek dari OSRM, sebaliknya OSRM", () => {
    const campus = campusRoute(START, FK)!;
    const longOsrm: LatLng[] = [START, { lat: -8.6713, lng: 115.2190 }, { lat: -8.6713, lng: 115.2180 }, FK];
    const picked = preferCampusRoute(START, FK, longOsrm);
    assert.ok(picked && "campus" in picked);
    assert.equal((picked as { campus: string }).campus, "sudirman");
    assert.ok(Math.abs(picked!.distance - campus.distance) < 1e-6);

    const shortOsrm: LatLng[] = [JB_GATE, REKTORAT];
    const osrmPick = preferCampusRoute(JB_GATE, REKTORAT, shortOsrm);
    assert.ok(osrmPick && osrmPick.campus === null);
    assert.ok(osrmPick!.distance < campusRoute(JB_GATE, REKTORAT)!.distance);

    assert.equal(preferCampusRoute(START, REKTORAT, null), null);
  });

  it("memakai rute kampus bila OSRM gagal", () => {
    const picked = preferCampusRoute(START, FK, null);
    assert.ok(picked && picked.campus === "sudirman");
  });
});

describe("data graf", () => {
  it("tidak menambah tautan koordinat rekaan", () => {
    assert.equal(CAMPUS_CONNECTORS.length, 0);
  });
});

describe("simpleSteps", () => {
  it("menghasilkan langkah belok dari rute kampus", () => {
    const r = campusRoute(START, FK)!;
    const steps = simpleSteps(r.points);
    assert.ok(steps.length >= 1);
    assert.ok(steps.every((s) => s.meters >= 0));
    assert.match(steps.at(-1)!.instruction, /tujuan/i);
  });
});
