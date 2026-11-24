"use client";
import { useEffect, useState } from "react";
import { simRoute } from "@/lib/geo";
import type { LatLng } from "@/lib/types";

/** Rute mengikuti jalan raya (via /api/route → OSRM). Fallback garis lurus (simRoute) bila gagal/timeout. */
export function useRoadRoute(from: LatLng | null | undefined, to: LatLng | null | undefined): { route: LatLng[]; road: boolean } {
  const [state, setState] = useState<{ key: string; route: LatLng[]; road: boolean } | null>(null);
  const key = from && to ? [from.lat, from.lng, to.lat, to.lng].map((n) => n.toFixed(5)).join(",") : "";
  useEffect(() => {
    if (!from || !to) return;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    fetch(`/api/route?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: { points: [number, number][] }) => setState({ key, route: j.points.map(([lat, lng]) => ({ lat, lng })), road: true }))
      .catch(() => { setState({ key, route: simRoute(from, to), road: false }); })
      .finally(() => clearTimeout(t));
    return () => { clearTimeout(t); ctl.abort(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!from || !to) return { route: [], road: false };
  return state?.key === key ? { route: state.route, road: state.road } : { route: [], road: false };
}
