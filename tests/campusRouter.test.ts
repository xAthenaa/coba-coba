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
const JB_GATE: LatLng = { lat: -8.7976237, lng: 115.171076 }; // Jalan Kampus Unud dekat Rektorat
const REKTORAT: LatLng = { lat: -8.79822, lng: 115.17239 };
const JB_CENTER: LatLng = { lat: -8.7985, lng: 115.17 };

/** Jarak OSRM foot terukur 2026-11-25 dari router.project-osrm.org (bukan dipanggil di tes). */
const OSRM_START_FK_M = 421.7;
const OSRM_JB_GATE_M = 276.6;
const OSRM_JB_CENTER_M = 869.2;

describe("campusAreaOf", () => {
  it("mengenali bbox Sudirman dan Jimbaran, menolak titik di luar kampus", () => {
    assert.equal(campusAreaOf(START), "sudirman");
    assert.equal(campusAreaOf(FK), "sudirman");
    assert.equal(campusAreaOf(REKTORAT), "jimbaran");
    assert.equal(campusAreaOf({ lat: -8.65, lng: 115.21 }), null);
    assert.equal(campusAreaOf({ lat: 0, lng: 0 }), null);
  });
});

describe("campusRoute Sudirman", () => {
  it("Pascasarjana/Kantin → Gedung FK mengikuti jalur dalam kampus, bukan memutar lewat jalan umum", () => {
    const r = campusRoute(START, FK);
    assert.ok(r, "harus ada rute kampus");
    assert.equal(r!.campus, "sudirman");
    const straight = distance(START, FK);
    assert.ok(straight > 160 && straight < 175, `garis lurus ${straight}`);
    // ~243 m (graf + konektor pasang), jauh di bawah detour OSRM ~422 m
    assert.ok(r!.distance > 200 && r!.distance < 300, `jarak kampus ${r!.distance}`);
    assert.ok(r!.distance < OSRM_START_FK_M);
    assert.ok(r!.distance > straight, "rute kampus harus mengikuti jalur, bukan garis lurus");
    assert.ok(r!.points.length >= 8, "bukan garis lurus 2 titik");
    assert.equal(r!.points[0].lat, START.lat);
    assert.equal(r!.points[0].lng, START.lng);
    assert.equal(r!.points.at(-1)!.lat, FK.lat);
    assert.equal(r!.points.at(-1)!.lng, FK.lng);
    // Tidak turun ke Jl. Ida Bagus Oka (sekitar lat ≤ -8.6738) atau memutar jauh ke barat/timur
    for (const p of r!.points) {
      assert.ok(p.lat > -8.6737 && p.lat < -8.6717, `lat di luar koridor dalam kampus: ${p.lat}`);
      assert.ok(p.lng > 115.2182 && p.lng < 115.2192, `lng di luar koridor dalam kampus: ${p.lng}`);
    }
    const len = pathLength(r!.points);
    assert.ok(Math.abs(len - r!.distance) < 1, "distance = panjang polyline");
  });

  it("Pascasarjana OSM dan SIM_START juga mendapat rute pendek ke FK", () => {
    const a = campusRoute(PASCASARJANA, FK);
    const b = campusRoute(SIM_START, FK);
    assert.ok(a && a.distance < 280);
    assert.ok(b && b.distance < 320);
    assert.ok(a!.distance < OSRM_START_FK_M);
    assert.ok(b!.distance < OSRM_START_FK_M);
  });
});

describe("campusRoute Jimbaran", () => {
  it("gerbang Jalan Kampus Unud → Rektorat tetap terhubung di graf kampus", () => {
    const r = campusRoute(JB_GATE, REKTORAT);
    assert.ok(r, "harus ada rute kampus");
    assert.equal(r!.campus, "jimbaran");
    assert.ok(r!.distance > 150 && r!.distance < 400, `jarak ${r!.distance}`);
    // OSRM di gerbang sudah bagus (~277 m); graf kampus boleh sedikit lebih panjang
    assert.ok(Math.abs(r!.distance - OSRM_JB_GATE_M) < 40);
    assert.ok(r!.points.length >= 5);
  });

  it("pusat kampus Jimbaran → Rektorat lebih pendek dari detour OSRM", () => {
    const r = campusRoute(JB_CENTER, REKTORAT);
    assert.ok(r);
    assert.ok(r!.distance < OSRM_JB_CENTER_M);
    assert.ok(r!.distance > distance(JB_CENTER, REKTORAT));
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

    // OSRM lebih pendek → pakai OSRM (kasus gerbang Jimbaran)
    const shortOsrm: LatLng[] = [JB_GATE, REKTORAT]; // garis lurus ~159 m, lebih pendek dari graf
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
