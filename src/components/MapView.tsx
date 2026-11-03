"use client";
import dynamic from "next/dynamic";
import type { MapProps } from "./MapInner";
export type { MapMarker } from "./MapInner";

/** Leaflet hanya di client (tidak SSR). */
const Inner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-ink-2">Memuat peta…</div>,
});
export function MapView(p: MapProps) { return <Inner {...p} />; }

export function Compass() {
  return (
    <div aria-label="Kompas, utara di atas" className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-primary bg-white shadow">
      <span className="text-xs font-bold leading-none text-primary">U</span>
      <svg width="14" height="26" viewBox="0 0 14 26"><path d="M7 0 13 13H1z" fill="#DC2626" /><path d="M7 26 1 13h12z" fill="#64748B" /><circle cx="7" cy="13" r="2" fill="#fff" /></svg>
    </div>
  );
}
