"use client";
import { useEffect, useState } from "react";
import { pathLength, simRoute } from "@/lib/geo";
import { campusRoute } from "@/lib/campusRouter";
import type { LatLng } from "@/lib/types";

/** Rute jalan kaki: graf jalur kampus (bila lebih pendek / OSRM gagal) atau OSRM. Fallback simRoute. */
export function useRoadRoute(from: LatLng | null | undefined, to: LatLng | null | undefined): { route: LatLng[]; road: boolean } {
  const [state, setState] = useState<{ key: string; route: LatLng[]; road: boolean } | null>(null);
  const key = from && to ? [from.lat, from.lng, to.lat, to.lng].map((n) => n.toFixed(5)).join(",") : "";
  useEffect(() => {
    if (!from || !to) return;
    const campus = campusRoute(from, to);
    if (campus) setState({ key, route: campus.points, road: true });
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    fetch(`/api/route?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { points: [number, number][] }) => {
        const osrm = j.points.map(([lat, lng]) => ({ lat, lng }));
        if (!campus || pathLength(osrm) < campus.distance) setState({ key, route: osrm, road: true });
      })
      .catch(() => {
        if (!campus) setState({ key, route: simRoute(from, to), road: false });
      })
      .finally(() => clearTimeout(t));
    return () => { clearTimeout(t); ctl.abort(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!from || !to) return { route: [], road: false };
  return state?.key === key ? { route: state.route, road: state.road } : { route: [], road: false };
}
