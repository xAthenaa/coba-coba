"use client";
import { useEffect, useState } from "react";
import { campuses, DEFAULT_CAMPUS } from "./data";
import { distance } from "./geo";
import type { LatLng } from "./types";

export type GeoState = "loading" | "ok" | "simulated" | "denied" | "off" | "offline";
export const LOC_PREF = "wayo-loc-pref"; // "allow" | "later"

/** Titik masuk kampus dipakai sebagai posisi simulasi bila GPS jauh dari kampus / tidak tersedia. */
export const SIM_START: LatLng = { lat: -8.6734, lng: 115.2221 };

export function useGeo(): { pos: LatLng | null; state: GeoState } {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [state, setState] = useState<GeoState>("loading");
  useEffect(() => {
    const goOffline = () => setState("offline");
    window.addEventListener("offline", goOffline);
    if (!navigator.onLine) setState("offline");
    const forced = new URLSearchParams(location.search).get("lokasi"); // ?lokasi=mati|ditolak|offline untuk demo state
    if (forced === "offline") { setState("offline"); return () => window.removeEventListener("offline", goOffline); }
    if (forced === "mati" || forced === "ditolak" || localStorage.getItem(LOC_PREF) === "later") {
      setState(forced === "mati" ? "off" : "denied");
      return () => window.removeEventListener("offline", goOffline);
    }
    if (!("geolocation" in navigator)) { setState("off"); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const real = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (distance(real, campuses[DEFAULT_CAMPUS].center) > 3000 && distance(real, campuses.jimbaran.center) > 3000) {
          setPos(SIM_START); setState("simulated");
        } else { setPos(real); setState("ok"); }
      },
      (err) => { setState(err.code === err.PERMISSION_DENIED ? "denied" : "off"); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 },
    );
    return () => { navigator.geolocation.clearWatch(id); window.removeEventListener("offline", goOffline); };
  }, []);
  return { pos, state };
}
