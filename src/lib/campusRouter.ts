import type { CampusId, LatLng } from "./types";
import { distance, pathLength } from "./geo";
import campusPathData from "../../data/campus-paths.json";

/** Data graf jalur kaki kampus (OSM). Lihat data/campus-paths.json untuk sumber & lisensi. */
type CampusPathsFile = {
  maxSnapMeters: number;
  connectors: unknown[];
  campuses: Record<string, {
    bbox: { south: number; west: number; north: number; east: number };
    nodes: number[][];
    edges: number[][];
  }>;
};

const data = campusPathData as unknown as CampusPathsFile;
export const MAX_SNAP_M = data.maxSnapMeters;
export const CAMPUS_CONNECTORS = data.connectors;

type Adj = Map<number, { to: number; w: number }[]>;
type Graph = {
  id: CampusId;
  bbox: { south: number; west: number; north: number; east: number };
  nodes: Map<number, LatLng>;
  adj: Adj;
};

function buildGraphs(): Record<CampusId, Graph> {
  const out = {} as Record<CampusId, Graph>;
  for (const id of ["sudirman", "jimbaran"] as CampusId[]) {
    const raw = data.campuses[id];
    const nodes = new Map<number, LatLng>();
    for (const [nid, lat, lng] of raw.nodes) nodes.set(nid, { lat, lng });
    const adj: Adj = new Map();
    const link = (a: number, b: number, w: number) => {
      const list = adj.get(a);
      if (list) list.push({ to: b, w });
      else adj.set(a, [{ to: b, w }]);
    };
    for (const [a, b] of raw.edges) {
      const pa = nodes.get(a), pb = nodes.get(b);
      if (!pa || !pb) continue;
      const w = distance(pa, pb);
      if (w <= 0) continue;
      link(a, b, w);
      link(b, a, w);
    }
    out[id] = { id, bbox: raw.bbox, nodes, adj };
  }
  return out;
}

const graphs = buildGraphs();

function inBbox(p: LatLng, b: Graph["bbox"]): boolean {
  return p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east;
}

/** Kampus yang memuat titik, atau null bila di luar bbox graf jalur kampus. */
export function campusAreaOf(p: LatLng): CampusId | null {
  if (inBbox(p, graphs.sudirman.bbox)) return "sudirman";
  if (inBbox(p, graphs.jimbaran.bbox)) return "jimbaran";
  return null;
}

function nearestNode(g: Graph, p: LatLng): { id: number; dist: number } | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const [id, q] of g.nodes) {
    const d = distance(p, q);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best == null ? null : { id: best, dist: bestD };
}

class MinHeap {
  private a: { d: number; id: number }[] = [];
  get size() { return this.a.length; }
  push(d: number, id: number) {
    const a = this.a;
    a.push({ d, id });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].d <= a[i].d) break;
      const t = a[p]; a[p] = a[i]; a[i] = t;
      i = p;
    }
  }
  pop(): { d: number; id: number } | undefined {
    const a = this.a;
    if (!a.length) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].d < a[m].d) m = l;
        if (r < a.length && a[r].d < a[m].d) m = r;
        if (m === i) break;
        const t = a[m]; a[m] = a[i]; a[i] = t;
        i = m;
      }
    }
    return top;
  }
}

/** A* (heuristik haversine) pada graf jalur kampus. */
function astar(g: Graph, src: number, dst: number): { dist: number; path: number[] } | null {
  const dest = g.nodes.get(dst);
  if (!dest) return null;
  const h = (id: number) => {
    const p = g.nodes.get(id);
    return p ? distance(p, dest) : 0;
  };
  const gScore = new Map<number, number>([[src, 0]]);
  const prev = new Map<number, number>();
  const open = new MinHeap();
  open.push(h(src), src);
  const closed = new Set<number>();
  while (open.size) {
    const cur = open.pop()!;
    if (closed.has(cur.id)) continue;
    if (cur.id === dst) {
      const path = [dst];
      let x = dst;
      while (x !== src) {
        const p = prev.get(x);
        if (p == null) return null;
        path.push(p);
        x = p;
      }
      path.reverse();
      return { dist: gScore.get(dst)!, path };
    }
    closed.add(cur.id);
    const gs = gScore.get(cur.id)!;
    for (const { to, w } of g.adj.get(cur.id) ?? []) {
      if (closed.has(to)) continue;
      const ng = gs + w;
      if (ng < (gScore.get(to) ?? Infinity)) {
        gScore.set(to, ng);
        prev.set(to, cur.id);
        open.push(ng + h(to), to);
      }
    }
  }
  return null;
}

export type CampusRoute = {
  points: LatLng[];
  distance: number;
  campus: CampusId;
  snapMeters: { from: number; to: number };
};

/**
 * Rute jalan kaki di graf jalur kampus bila asal & tujuan ada di kampus yang sama.
 * Titik dipasang ke simpul terdekat (jarak pasang digambar sebagai konektor pendek).
 */
export function campusRoute(from: LatLng, to: LatLng, maxSnap = MAX_SNAP_M): CampusRoute | null {
  const campus = campusAreaOf(from);
  if (!campus || campusAreaOf(to) !== campus) return null;
  const g = graphs[campus];
  const a = nearestNode(g, from);
  const b = nearestNode(g, to);
  if (!a || !b || a.dist > maxSnap || b.dist > maxSnap) return null;
  const found = astar(g, a.id, b.id);
  if (!found) return null;
  const mid = found.path.map((id) => g.nodes.get(id)!);
  const points = [from, ...mid, to];
  return { points, distance: a.dist + found.dist + b.dist, campus, snapMeters: { from: a.dist, to: b.dist } };
}

/** Pilih rute kampus bila ada dan lebih pendek (atau OSRM tidak ada). */
export function preferCampusRoute(from: LatLng, to: LatLng, osrm: LatLng[] | null | undefined): CampusRoute | { points: LatLng[]; distance: number; campus: null } | null {
  const campus = campusRoute(from, to);
  if (campus && (!osrm || osrm.length < 2 || campus.distance <= pathLength(osrm))) return campus;
  if (osrm && osrm.length >= 2) return { points: osrm, distance: pathLength(osrm), campus: null };
  return campus;
}

export type RouteStep = { instruction: string; meters: number };

function turnOf(a: LatLng, b: LatLng, c: LatLng): "kiri" | "kanan" | "lurus" {
  const cross = (b.lng - a.lng) * (c.lat - b.lat) - (b.lat - a.lat) * (c.lng - b.lng);
  const mag = Math.abs(cross);
  // Ambang kasar ~ belokan nyata, bukan getaran digit koordinat.
  const scale = distance(a, b) * distance(b, c);
  if (scale <= 0 || mag / scale < 0.15) return "lurus";
  return cross > 0 ? "kiri" : "kanan";
}

/** Langkah belok sederhana dari polyline (opsional untuk UI navigasi yang sudah ada). */
export function simpleSteps(points: LatLng[]): RouteStep[] {
  if (points.length < 2) return [];
  const steps: RouteStep[] = [];
  let acc = 0;
  let pending: "kiri" | "kanan" | "lurus" = "lurus";
  for (let i = 1; i < points.length; i++) {
    acc += distance(points[i - 1], points[i]);
    if (i < points.length - 1) {
      const t = turnOf(points[i - 1], points[i], points[i + 1]);
      if (t !== "lurus" && acc >= 8) {
        const inst = pending === "lurus" ? `Lurus ${Math.round(acc)} m` : `Belok ${pending}`;
        steps.push({ instruction: inst, meters: acc });
        pending = t;
        acc = 0;
      }
    }
  }
  const last = pending === "lurus" ? `Lurus ke tujuan` : `Belok ${pending} ke tujuan`;
  steps.push({ instruction: last, meters: acc });
  return steps;
}
