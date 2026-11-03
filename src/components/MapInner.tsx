"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { tokens } from "@/lib/tokens";
import type { LatLng } from "@/lib/types";

export interface MapMarker { id: string; lat: number; lng: number; cat: string; label: string; selected?: boolean }
export interface MapProps {
  center: LatLng; zoom?: number; markers?: MapMarker[]; user?: LatLng | null; route?: LatLng[]; walked?: LatLng[];
  onMarker?: (id: string) => void; onMapClick?: (ll: LatLng) => void; focus?: LatLng | null; focusKey?: string | number;
  interactive?: boolean;
}

function icon(color: string, selected?: boolean) {
  const s = selected ? 40 : 30;
  return L.divIcon({
    className: "wayo-pin", iconSize: [s, s], iconAnchor: [s / 2, s],
    html: `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 22s-7-6.4-7-12a7 7 0 0 1 14 0c0 5.6-7 12-7 12z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>`,
  });
}

function Controller({ focus, focusKey, onMapClick, route }: { focus?: LatLng | null; focusKey?: string | number; onMapClick?: (l: LatLng) => void; route?: LatLng[] }) {
  const map = useMap();
  useEffect(() => { if (focus) map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 18), { duration: 0.6 }); }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (route && route.length > 1) map.fitBounds(L.latLngBounds(route.map((p) => [p.lat, p.lng])), { padding: [48, 48] });
  }, [route?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useMapEvents({ click: (e) => onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function MapInner({ center, zoom = 17, markers = [], user, route, walked, onMarker, onMapClick, focus, focusKey, interactive = true }: MapProps) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} zoomControl={false} attributionControl
      dragging={interactive} scrollWheelZoom={interactive} className="h-full w-full" style={{ background: "#E5E7EB" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      {route && route.length > 1 && <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: tokens.color.primary, weight: 6, opacity: 0.85 }} />}
      {walked && walked.length > 1 && <Polyline positions={walked.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#9CA3AF", weight: 6 }} />}
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={icon(tokens.category[m.cat] ?? tokens.color.primary, m.selected)} title={m.label}
          eventHandlers={{ click: () => onMarker?.(m.id) }} />
      ))}
      {user && <>
        <CircleMarker center={[user.lat, user.lng]} radius={16} pathOptions={{ color: "#2563EB", weight: 0, fillOpacity: 0.18 }} />
        <CircleMarker center={[user.lat, user.lng]} radius={7} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }} />
      </>}
      <Controller focus={focus} focusKey={focusKey} onMapClick={onMapClick} route={route} />
    </MapContainer>
  );
}
