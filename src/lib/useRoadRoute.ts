"use client";
import { useEffect, useState } from "react";
import { maybeCampusStraight, simRoute } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

export type RoadRoute = { route: LatLng[]; road: boolean; campusStraight: boolean };

/** Rute mengikuti jalan raya (via /api/route → OSRM). Fallback garis L (simRoute) bila gagal/timeout.
 *  Jika rute OSRM memutar jauh pada jarak pendek, diganti garis lurus dalam kampus (lihat maybeCampusStraight). */
export function useRoadRoute(from: LatLng | null | undefined, to: LatLng | null | undefined): RoadRoute {
  const [state, setState] = useState<{ key: string; route: LatLng[]; road: boolean; campusStraight: boolean } | null>(null);
  const key = from && to ? [from.lat, from.lng, to.lat, to.lng].map((n) => n.toFixed(5)).join(",") : "";
  useEffect(() => {
    if (!from || !to) return;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    fetch(`/api/route?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { points: [number, number][] }) => {
        const raw = j.points.map(([lat, lng]) => ({ lat, lng }));
        const { route, campusStraight } = maybeCampusStraight(from, to, raw);
        setState({ key, route, road: true, campusStraight });
      })
      .catch(() => { setState({ key, route: simRoute(from, to), road: false, campusStraight: false }); })
      .finally(() => clearTimeout(t));
    return () => { clearTimeout(t); ctl.abort(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!from || !to) return { route: [], road: false, campusStraight: false };
  return state?.key === key ? { route: state.route, road: state.road, campusStraight: state.campusStraight } : { route: [], road: false, campusStraight: false };
}
