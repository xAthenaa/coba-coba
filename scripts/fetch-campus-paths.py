#!/usr/bin/env python3
"""Ambil way highway=* di seluruh Kampus Sudirman & Jimbaran (Universitas Udayana)
dan tulis graf jalur kaki statis yang ringkas.

Batas kampus dari OSM:
  - Jimbaran: way/81124180 (amenity=university, name=Universitas Udayana)
    plus way/304203285 Stadium of Udayana University (GOR, di luar poligon utama)
  - Sudirman: rel/5468912 (multipolygon amenity=university, dua outer)
    plus way/311218916 Faculty of Economic and Business (menjorok ke selatan)

Area keanggotaan = union poligon + margin 50 m.
Sumber way: API peta OSM 0.6 (dibagi ubin bila bbox besar). Overpass tetap
dicoba sebagai opsi, tetapi mirror sering gagal.

Tidak menambahkan koordinat rekaan. Tautan buatan <40 m hanya jika terpaksa
dan harus didokumentasikan di field "connectors".
"""
from __future__ import annotations

import argparse
import json
import math
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

UA = "WAYO-campus-paths/1.1 (https://github.com/xAthenaa/coba-coba)"
OSM_API = "https://api.openstreetmap.org/api/0.6"
MARGIN_M = 50.0
MAX_SNAP_M = 80.0
# ~0.00045° lintang ≈ 50 m; bujur disesuaikan di fungsi margin_deg.

BOUNDARIES = {
    "sudirman": {
        "note": "Kampus Sudirman Unud: blok di antara Jl. P.B. Sudirman, Jl. Ida Bagus Oka, dan Jl. Dokter Goris, termasuk FEB.",
        "features": [
            {"type": "relation", "id": 5468912, "role": "campus", "name": "amenity=university (Kampus Sudirman, tanpa nama di OSM)"},
            {"type": "way", "id": 311218916, "role": "facility", "name": "Faculty of Economic and Business Udayana University"},
        ],
    },
    "jimbaran": {
        "note": "Kampus Jimbaran Unud: poligon Universitas Udayana (semua fakultas, Rektorat, Widya Sabha, RS Unud) plus Stadion/GOR.",
        "features": [
            {"type": "way", "id": 81124180, "role": "campus", "name": "Universitas Udayana"},
            {"type": "way", "id": 304203285, "role": "facility", "name": "Stadium of Udayana University (GOR)"},
        ],
    },
}

WALKABLE = [
    "footway", "path", "pedestrian", "steps", "track", "service",
    "unclassified", "living_street", "residential", "tertiary", "secondary",
    "primary", "cycleway", "corridor", "road",
]
SKIP_HW = {
    "motorway", "motorway_link", "trunk", "trunk_link", "proposed",
    "construction", "raceway", "busway", "bus_guideway", "abandoned", "elevator",
}


def intended_overpass(bboxes: dict[str, dict]) -> str:
    parts = []
    for name, b in bboxes.items():
        parts.append(
            f'  way["highway"~"^(footway|path|pedestrian|steps|track|service|unclassified|living_street|residential|tertiary|secondary|primary|cycleway|corridor|road)$"]'
            f'({b["south"]},{b["west"]},{b["north"]},{b["east"]});'
        )
    return "[out:json][timeout:90];\n(\n" + "\n".join(parts) + "\n);\nout body;\n>;\nout skel qt;\n"


def hav(a: tuple[float, float], b: tuple[float, float]) -> float:
    R = 6371000.0
    t = math.pi / 180
    dlat = (b[0] - a[0]) * t
    dlng = (b[1] - a[1]) * t
    h = math.sin(dlat / 2) ** 2 + math.cos(a[0] * t) * math.cos(b[0] * t) * math.sin(dlng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def margin_deg(lat: float, meters: float = MARGIN_M) -> tuple[float, float]:
    dlat = meters / 110540.0
    dlng = meters / (111320.0 * math.cos(math.radians(lat)))
    return dlat, dlng


def point_in_ring(pt: tuple[float, float], ring: list[tuple[float, float]]) -> bool:
    x, y = pt[1], pt[0]
    pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
    inside = False
    n = len(pts)
    for i in range(n):
        y1, x1 = pts[i]
        y2, x2 = pts[(i + 1) % n]
        if (y1 > y) != (y2 > y) and (x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-18) + x1):
            inside = not inside
    return inside


def dist_to_segment(p: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> float:
    mx = 111320.0 * math.cos(math.radians(p[0]))
    my = 110540.0
    px, py = p[1] * mx, p[0] * my
    ax, ay = a[1] * mx, a[0] * my
    bx, by = b[1] * mx, b[0] * my
    vx, vy = bx - ax, by - ay
    lv = vx * vx + vy * vy
    if lv <= 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / lv))
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy))


def dist_to_rings(pt: tuple[float, float], rings: list[list[tuple[float, float]]]) -> float:
    if any(point_in_ring(pt, r) for r in rings):
        return 0.0
    best = 1e18
    for r in rings:
        pts = r[:-1] if len(r) > 1 and r[0] == r[-1] else r
        for i in range(len(pts)):
            best = min(best, dist_to_segment(pt, pts[i], pts[(i + 1) % len(pts)]))
    return best


def in_area(pt: tuple[float, float], rings, bbox, margin: float = MARGIN_M) -> bool:
    if not (bbox["south"] <= pt[0] <= bbox["north"] and bbox["west"] <= pt[1] <= bbox["east"]):
        return False
    return dist_to_rings(pt, rings) <= margin


def osm_get(path: str, dest: Path) -> Path:
    url = f"{OSM_API}{path}"
    print(f"GET {url}")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        dest.write_bytes(r.read())
    print(f"  wrote {dest} ({dest.stat().st_size} bytes)")
    return dest


def parse_osm(path: Path):
    root = ET.parse(path).getroot()
    nodes: dict[str, tuple[float, float]] = {}
    for n in root.findall("node"):
        nodes[n.attrib["id"]] = (float(n.attrib["lat"]), float(n.attrib["lon"]))
    ways = []
    way_by_id = {}
    for w in root.findall("way"):
        tags = {t.attrib["k"]: t.attrib["v"] for t in w.findall("tag")}
        nds = [nd.attrib["ref"] for nd in w.findall("nd")]
        rec = (w.attrib["id"], tags, nds)
        ways.append(rec)
        way_by_id[w.attrib["id"]] = rec
    rels = []
    for r in root.findall("relation"):
        tags = {t.attrib["k"]: t.attrib["v"] for t in r.findall("tag")}
        members = [(m.attrib.get("type"), m.attrib.get("ref"), m.attrib.get("role", "")) for m in r.findall("member")]
        rels.append((r.attrib["id"], tags, members))
    return nodes, ways, rels, way_by_id


def close_ring(pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
    if pts and pts[0] != pts[-1]:
        return pts + [pts[0]]
    return pts


def rings_from_feature(feat: dict, cache: Path) -> list[list[tuple[float, float]]]:
    typ, oid = feat["type"], feat["id"]
    dest = cache / f"{typ}-{oid}-full.xml"
    if not dest.exists():
        osm_get(f"/{typ}/{oid}/full", dest)
    nodes, ways, rels, way_by_id = parse_osm(dest)
    rings: list[list[tuple[float, float]]] = []
    if typ == "way":
        _wid, _tags, nds = way_by_id[str(oid)]
        pts = [nodes[i] for i in nds if i in nodes]
        if len(pts) >= 3:
            rings.append(close_ring(pts))
    elif typ == "relation":
        rel = next((r for r in rels if r[0] == str(oid)), None)
        if not rel:
            raise SystemExit(f"relation {oid} missing in full extract")
        _id, tags, members = rel
        print(f"  relation/{oid} tags name={tags.get('name')!r} amenity={tags.get('amenity')} type={tags.get('type')}")
        for mtyp, ref, role in members:
            if mtyp != "way" or role not in ("outer", "", "out"):
                continue
            if ref not in way_by_id:
                print(f"  missing member way/{ref}")
                continue
            _w, _t, nds = way_by_id[ref]
            pts = [nodes[i] for i in nds if i in nodes]
            if len(pts) >= 3:
                rings.append(close_ring(pts))
    return rings


def bbox_of_rings(rings, margin: float = MARGIN_M) -> dict:
    lats = [p[0] for r in rings for p in r]
    lngs = [p[1] for r in rings for p in r]
    lat0 = (min(lats) + max(lats)) / 2
    dlat, dlng = margin_deg(lat0, margin)
    return {
        "south": min(lats) - dlat,
        "west": min(lngs) - dlng,
        "north": max(lats) + dlat,
        "east": max(lngs) + dlng,
    }


def tile_bboxes(bbox: dict, max_span: float = 0.012) -> list[dict]:
    slat = bbox["north"] - bbox["south"]
    slng = bbox["east"] - bbox["west"]
    ny = max(1, math.ceil(slat / max_span))
    nx = max(1, math.ceil(slng / max_span))
    overlap = 0.00015
    out = []
    for iy in range(ny):
        for ix in range(nx):
            out.append({
                "south": bbox["south"] + iy * slat / ny - (overlap if iy else 0),
                "north": bbox["south"] + (iy + 1) * slat / ny + (overlap if iy < ny - 1 else 0),
                "west": bbox["west"] + ix * slng / nx - (overlap if ix else 0),
                "east": bbox["west"] + (ix + 1) * slng / nx + (overlap if ix < nx - 1 else 0),
            })
    return out


def fetch_map_tiles(name: str, bbox: dict, cache: Path, refetch: bool) -> tuple[dict, list]:
    tiles = tile_bboxes(bbox)
    all_nodes: dict[str, tuple[float, float]] = {}
    all_ways = {}
    for i, tb in enumerate(tiles):
        dest = cache / f"{name}-tile-{i}.xml"
        if refetch or not dest.exists():
            q = f'{tb["west"]},{tb["south"]},{tb["east"]},{tb["north"]}'
            try:
                osm_get(f"/map?bbox={q}", dest)
            except urllib.error.HTTPError as e:
                if e.code == 400 and (tb["north"] - tb["south"]) * (tb["east"] - tb["west"]) > 1e-6:
                    # bbox ditolak — pecah lagi
                    print(f"  HTTP 400 on tile {i}, splitting further")
                    sub = tile_bboxes(tb, max_span=max((tb["north"] - tb["south"]) / 2, 0.004))
                    for j, sb in enumerate(sub):
                        sd = cache / f"{name}-tile-{i}-{j}.xml"
                        qq = f'{sb["west"]},{sb["south"]},{sb["east"]},{sb["north"]}'
                        osm_get(f"/map?bbox={qq}", sd)
                        n, w, _r, wb = parse_osm(sd)
                        all_nodes.update(n)
                        all_ways.update(wb)
                    continue
                raise
        n, w, _r, wb = parse_osm(dest)
        all_nodes.update(n)
        all_ways.update(wb)
    print(f"  {name}: merged {len(all_nodes)} nodes, {len(all_ways)} ways from {len(tiles)} tile(s)")
    return all_nodes, list(all_ways.values())


def keep_way(tags: dict) -> bool:
    hw = tags.get("highway")
    if not hw or hw in SKIP_HW or hw not in WALKABLE:
        return False
    if tags.get("area") == "yes":
        return False
    if tags.get("foot") == "no":
        return False
    return True


def build_graph(nodes, ways, rings, bbox):
    used: dict[str, tuple[float, float]] = {}
    edges: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    type_count: Counter[str] = Counter()
    restricted = 0
    way_count = 0
    for wid, tags, nds in ways:
        if not keep_way(tags):
            continue
        pts = [(i, nodes[i]) for i in nds if i in nodes]
        if not pts:
            continue
        if not any(in_area(p, rings, bbox) for _i, p in pts):
            continue
        way_count += 1
        type_count[tags["highway"]] += 1
        if tags.get("access") in {"private", "no", "destination", "customers"}:
            restricted += 1
        for a, b in zip(nds, nds[1:]):
            if a not in nodes or b not in nodes:
                continue
            pa, pb = nodes[a], nodes[b]
            if not (in_area(pa, rings, bbox) or in_area(pb, rings, bbox)):
                continue
            if hav(pa, pb) <= 0:
                continue
            key = (a, b) if a < b else (b, a)
            if key in seen:
                continue
            seen.add(key)
            used[a] = pa
            used[b] = pb
            edges.append((a, b))
    return used, edges, way_count, dict(sorted(type_count.items())), restricted


def components(used, edges):
    adj = defaultdict(list)
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    seen = set()
    comps = []
    for n in used:
        if n in seen:
            continue
        st = [n]
        seen.add(n)
        c = [n]
        while st:
            u = st.pop()
            for v in adj[u]:
                if v not in seen:
                    seen.add(v)
                    st.append(v)
                    c.append(v)
        comps.append(c)
    comps.sort(key=len, reverse=True)
    return comps


def compact(used, edges):
    ids = sorted(used, key=lambda i: (used[i][0], used[i][1], i))
    index = {oid: i for i, oid in enumerate(ids)}
    coords = []
    for oid in ids:
        lat, lng = used[oid]
        coords.append(round(lat, 7))
        coords.append(round(lng, 7))
    flat = []
    for a, b in edges:
        ia, ib = index[a], index[b]
        if ia > ib:
            ia, ib = ib, ia
        flat.append((ia, ib))
    flat = sorted(set(flat))
    edge_arr = []
    for ia, ib in flat:
        edge_arr.append(ia)
        edge_arr.append(ib)
    return coords, edge_arr, index


def ring_to_json(ring: list[tuple[float, float]]) -> list[list[float]]:
    pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
    return [[round(p[0], 7), round(p[1], 7)] for p in pts]


def main() -> None:
    here = Path(__file__).resolve().parent
    repo = here.parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default="/tmp/wayo-osm")
    parser.add_argument("--refetch", action="store_true")
    parser.add_argument("--out", default=str(repo / "data" / "campus-paths.json"))
    args = parser.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)

    campuses = {}
    bboxes = {}
    for name, meta in BOUNDARIES.items():
        print(f"\n==== batas {name} ====")
        rings: list[list[tuple[float, float]]] = []
        sources = []
        for feat in meta["features"]:
            fr = rings_from_feature(feat, cache)
            print(f"  {feat['type']}/{feat['id']} ({feat['name']}): {len(fr)} ring(s), pts={[len(r) for r in fr]}")
            rings.extend(fr)
            sources.append(f"OSM {feat['type']}/{feat['id']} ({feat['name']})")
        bbox = bbox_of_rings(rings, MARGIN_M)
        bboxes[name] = bbox
        print(f"  bbox+{MARGIN_M:.0f}m {bbox}")
        nodes, ways = fetch_map_tiles(name, bbox, cache, args.refetch)
        used, edges, way_count, type_count, restricted = build_graph(nodes, ways, rings, bbox)
        comps = components(used, edges)
        sizes = [len(c) for c in comps]
        print(f"  graph ways={way_count} nodes={len(used)} edges={len(edges)} types={type_count} restricted={restricted}")
        print(f"  components={len(comps)} sizes={sizes[:15]}{'...' if len(sizes)>15 else ''} main={sizes[0] if sizes else 0}/{len(used)}")
        coords, edge_arr, _idx = compact(used, edges)
        campuses[name] = {
            "note": meta["note"],
            "boundarySource": sources,
            "bbox": {k: round(v, 7) for k, v in bbox.items()},
            "marginMeters": MARGIN_M,
            "rings": [ring_to_json(r) for r in rings],
            "wayCount": way_count,
            "wayTypes": type_count,
            "restrictedAccessWays": restricted,
            "nodeCount": len(used),
            "edgeCount": len(edges),
            "componentSizes": sizes,
            "coords": coords,
            "edges": edge_arr,
        }

    wit = timezone(timedelta(hours=8))
    payload = {
        "attribution": "© OpenStreetMap contributors (ODbL 1.0)",
        "source": {
            "intendedOverpassEndpoint": "https://overpass-api.de/api/interpreter",
            "intendedOverpassQl": intended_overpass(bboxes),
            "used": "https://api.openstreetmap.org/api/0.6/{way,relation}/id/full and /map?bbox= (tiled if needed)",
            "reason": "Batas kampus dari objek OSM (way/relation). Way highway diambil lewat API peta OSM 0.6 karena mirror Overpass sering gagal/kosong.",
            "fetchedAt": datetime.now(wit).isoformat(timespec="seconds"),
            "license": "ODbL-1.0",
        },
        "walkableHighways": WALKABLE,
        "connectors": [],
        "connectorNote": "Tidak ada tautan buatan. Semua fakultas utama ada di komponen utama. GOR/Stadion Jimbaran (way/304203285) terpisah 199 m dari graf utama tanpa way OSM pendek (<40 m), jadi tidak ditautkan — rute ke GOR memakai OSRM. Komponen kecil di pinggir tidak ditautkan.",
        "maxSnapMeters": MAX_SNAP_M,
        "marginMeters": MARGIN_M,
        "campuses": campuses,
    }
    out = Path(args.out)
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"\nwrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
