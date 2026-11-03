"use client";
import { useDB } from "./store";
import { campusOf, getPlace, pinVisible, places } from "./data";
import type { CampusId, Category, Pin } from "./types";

export interface MapItem { id: string; name: string; cat: Category; lat: number; lng: number; campus: CampusId; pin?: Pin; hours?: string; description?: string }

/** Semua titik di peta pengunjung: tempat + pin panitia yang sedang aktif (pin kedaluwarsa/terjadwal disembunyikan). */
export function useMapItems(includeHidden = false): MapItem[] {
  const db = useDB();
  return [
    ...places.map((p) => ({ id: p.id, name: p.name, cat: p.category, lat: p.lat, lng: p.lng, campus: p.campus, hours: p.hours, description: p.description })),
    ...db.pins.filter((p) => includeHidden || pinVisible(p)).map((p) => ({ id: p.id, name: p.label, cat: p.category, lat: p.lat, lng: p.lng, campus: campusOf(p), pin: p })),
  ];
}
export function useItem(id: string) { return useMapItems(true).find((i) => i.id === id); }
export const eventsAtPlace = (placeId: string) => getPlace(placeId);
