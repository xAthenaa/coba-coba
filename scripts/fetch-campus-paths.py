#!/usr/bin/env python3
"""Ambil way highway=* dari OSM (area Kampus Sudirman & Jimbaran) dan tulis graf statis.

Sumber yang diinginkan: Overpass QL (lihat INTENDED_OVERPASS di bawah).
Mirror Overpass yang dicoba (overpass-api.de, lz4, kumi, private.coffee, overpass.osm.ch)
gagal SSL/timeout atau mengembalikan extract kosong, jadi skrip ini memakai
API peta resmi OSM 0.6 (data way/node yang sama, lisensi ODbL):

  GET https://api.openstreetmap.org/api/0.6/map?bbox=minlon,minlat,maxlon,maxlat

Tidak menambahkan koordinat rekaan. Tautan buatan <40 m hanya jika terpaksa
dan harus didokumentasikan di field "connectors".
"""
from __future__ import annotations

import argparse
import json
import math
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone, timedelta
from pathlib import Path

UA = "WAYO-campus-paths/1.0 (https://github.com/xAthenaa/coba-coba)"
OSM_MAP = "https://api.openstreetmap.org/api/0.6/map"

# bbox: south, west, north, east (area prioritas di sekitar gedung utama)
CAMPUSES = {
    "sudirman": {
        "bbox": {"south": -8.6748, "west": 115.2170, "north": -8.6706, "east": 115.2218},
        "note": "Kampus Sudirman: Gedung FK, Pascasarjana, Perpustakaan, Rektorat/pusat kampus, gerbang Jl. PB Sudirman & Jl. Ida Bagus Oka.",
    },
    "jimbaran": {
        "bbox": {"south": -8.8010, "west": 115.1685, "north": -8.7955, "east": 115.1755},
        "note": "Kampus Jimbaran: sekitar Rektorat dan Jalan Kampus Unud.",
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

INTENDED_OVERPASS = """[out:json][timeout:60];
(
  way["highway"~"^(footway|path|pedestrian|steps|track|service|unclassified|living_street|residential|tertiary|secondary|primary|cycleway|corridor|road)$"]({sudirman_bbox});
  way["highway"~"^(footway|path|pedestrian|steps|track|service|unclassified|living_street|residential|tertiary|secondary|primary|cycleway|corridor|road)$"]({jimbaran_bbox});
);
out body;
>;
out skel qt;""".format(
    sudirman_bbox="-8.6748,115.2170,-8.6706,115.2218",
    jimbaran_bbox="-8.8010,115.1685,-8.7955,115.1755",
)


def hav(a: tuple[float, float], b: tuple[float, float]) -> float:
    R = 6371000.0
    t = math.pi / 180
    dlat = (b[0] - a[0]) * t
    dlng = (b[1] - a[1]) * t
    h = math.sin(dlat / 2) ** 2 + math.cos(a[0] * t) * math.cos(b[0] * t) * math.sin(dlng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def in_bbox(p: tuple[float, float], bbox: dict, pad: float = 0.0003) -> bool:
    return (bbox["south"] - pad) <= p[0] <= (bbox["north"] + pad) and (bbox["west"] - pad) <= p[1] <= (bbox["east"] + pad)


def keep_way(tags: dict) -> bool:
    hw = tags.get("highway")
    if not hw or hw in SKIP_HW or hw not in WALKABLE:
        return False
    if tags.get("area") == "yes":
        return False
    if tags.get("foot") == "no":
        return False
    return True


def fetch_bbox(bbox: dict, dest: Path) -> None:
    # OSM map API: bbox=minlon,minlat,maxlon,maxlat
    q = f'{bbox["west"]},{bbox["south"]},{bbox["east"]},{bbox["north"]}'
    url = f"{OSM_MAP}?bbox={q}"
    print(f"GET {url}")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


def parse_xml(path: Path):
    root = ET.parse(path).getroot()
    nodes = {
        n.attrib["id"]: (float(n.attrib["lat"]), float(n.attrib["lon"]))
        for n in root.findall("node")
    }
    ways = []
    for w in root.findall("way"):
        tags = {t.attrib["k"]: t.attrib["v"] for t in w.findall("tag")}
        nds = [nd.attrib["ref"] for nd in w.findall("nd")]
        ways.append((w.attrib["id"], tags, nds))
    return nodes, ways


def build_campus(name: str, meta: dict, xml_path: Path) -> dict:
    bbox = meta["bbox"]
    nodes, ways = parse_xml(xml_path)
    used: dict[str, tuple[float, float]] = {}
    edges: list[tuple[int, int]] = []
    seen_e: set[tuple[int, int]] = set()
    type_count: Counter[str] = Counter()
    restricted = 0
    way_count = 0
    for _wid, tags, nds in ways:
        if not keep_way(tags):
            continue
        pts = [nodes[i] for i in nds if i in nodes]
        if not pts or not any(in_bbox(p, bbox, pad=0) for p in pts):
            continue
        way_count += 1
        type_count[tags["highway"]] += 1
        if tags.get("access") in {"private", "no", "destination", "customers"}:
            restricted += 1
        for a, b in zip(nds, nds[1:]):
            if a not in nodes or b not in nodes:
                continue
            pa, pb = nodes[a], nodes[b]
            if not (in_bbox(pa, bbox) or in_bbox(pb, bbox)):
                continue
            if hav(pa, pb) <= 0:
                continue
            ia, ib = int(a), int(b)
            key = (ia, ib) if ia < ib else (ib, ia)
            if key in seen_e:
                continue
            seen_e.add(key)
            used[a] = pa
            used[b] = pb
            edges.append([ia, ib])
    node_rows = [[int(i), round(p[0], 7), round(p[1], 7)] for i, p in used.items()]
    node_rows.sort(key=lambda r: r[0])
    edges.sort()
    return {
        "bbox": bbox,
        "note": meta["note"],
        "wayCount": way_count,
        "wayTypes": dict(sorted(type_count.items())),
        "restrictedAccessWays": restricted,
        "nodeCount": len(node_rows),
        "edgeCount": len(edges),
        "nodes": node_rows,
        "edges": edges,
    }


def main() -> None:
    here = Path(__file__).resolve().parent
    repo = here.parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default="/tmp/wayo-osm", help="direktori XML mentah")
    parser.add_argument("--refetch", action="store_true")
    parser.add_argument("--out", default=str(repo / "data" / "campus-paths.json"))
    args = parser.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)

    campuses = {}
    for name, meta in CAMPUSES.items():
        xml_path = cache / f"{name}.xml"
        if args.refetch or not xml_path.exists():
            fetch_bbox(meta["bbox"], xml_path)
        campuses[name] = build_campus(name, meta, xml_path)
        c = campuses[name]
        print(f"{name}: ways={c['wayCount']} nodes={c['nodeCount']} edges={c['edgeCount']} types={c['wayTypes']} restricted={c['restrictedAccessWays']}")

    wit = timezone(timedelta(hours=8))
    payload = {
        "attribution": "© OpenStreetMap contributors (ODbL 1.0)",
        "source": {
            "intendedOverpassEndpoint": "https://overpass-api.de/api/interpreter",
            "intendedOverpassQl": INTENDED_OVERPASS,
            "used": "https://api.openstreetmap.org/api/0.6/map?bbox=minlon,minlat,maxlon,maxlat",
            "reason": "Mirror Overpass (overpass-api.de, lz4, kumi, private.coffee) gagal SSL/timeout; overpass.osm.ch merespons tetapi extract kosong (timestamp_osm_base tidak valid). API peta OSM 0.6 dipakai sebagai sumber way/node yang sama.",
            "fetchedAt": datetime.now(wit).isoformat(timespec="seconds"),
            "license": "ODbL-1.0",
        },
        "walkableHighways": WALKABLE,
        "connectors": [],
        "connectorNote": "Tidak ada tautan buatan. Komponen utama graf OSM sudah menghubungkan area prioritas (Sudirman: Pascasarjana/Kantin–Gedung FK–Perpustakaan; Jimbaran: sekitar Rektorat). Celah <40 m hanya ada di komponen kecil di pinggir perumahan, tidak ditambahkan.",
        "maxSnapMeters": 80,
        "campuses": campuses,
    }
    out = Path(args.out)
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
