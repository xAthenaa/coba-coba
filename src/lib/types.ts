export type Category = "gedung" | "event" | "kantin" | "toilet" | "parkir" | "info" | "stand";
export type CampusId = "sudirman" | "jimbaran";
export interface LatLng { lat: number; lng: number }
export interface Place extends LatLng {
  id: string; name: string; category: Category; campus: CampusId;
  hours?: string; description?: string; distanceM?: number; walkMin?: number;
}
export interface Organizer { id: string; name: string; logo: string; description: string; contact: string; faculty: string }
export interface WEvent {
  id: string; organizerId: string; name: string; description: string; poster: string; placeId: string;
  faculty: string; start: string; end: string; speakers: string[]; facilities: string[]; status?: string;
}
export interface Pin extends LatLng {
  id: string; eventId: string; label: string; category: Category; type: "timed" | "permanent"; start?: string; end?: string;
}
export interface Notif { id: string; type: string; eventId?: string; pinId?: string; text: string; time: string }
export type EventStatus = "berlangsung" | "akan datang" | "selesai";
export type PinStatus = "Aktif" | "Terjadwal" | "Kedaluwarsa";
