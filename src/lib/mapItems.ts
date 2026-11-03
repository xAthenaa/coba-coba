"use client";
import { useActivePins, usePlaces } from "./api";
import { campusOf } from "./data";
import type { CampusId, Category, Pin } from "./types";

export interface MapItem { id: string; name: string; cat: Category; lat: number; lng: number; campus: CampusId; pin?: Pin; hours?: string; description?: string }

/** Semua titik di peta pengunjung: tempat + pin panitia yang sedang aktif (server sudah menyaring pin terjadwal/kedaluwarsa). */
export function useMapItems(): MapItem[] {
  const { data: places } = usePlaces();
  const { data: pins } = useActivePins();
  return [
    ...(places ?? []).map((p) => ({ id: p.id, name: p.name, cat: p.category, lat: p.lat, lng: p.lng, campus: p.campus, hours: p.hours, description: p.description })),
    ...(pins ?? []).map((p) => ({ id: p.id, name: p.label, cat: p.category, lat: p.lat, lng: p.lng, campus: campusOf(p), pin: p })),
  ];
}
export function useItem(id: string) { return useMapItems().find((i) => i.id === id); }
