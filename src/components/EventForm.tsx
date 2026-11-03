"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Header } from "./ui";
import { Screen } from "./Screen";
import { MapView } from "./MapView";
import { useToast } from "./Toast";
import { saveEvent } from "@/lib/api";
import { campuses, places, faculties } from "@/lib/data";
import { fromLocalInput, myOrganizerId, toLocalInput } from "@/lib/panitia";
import { useSession } from "@/lib/auth";
import type { WEvent } from "@/lib/types";

/** P-02 Tambah/Edit Event (lokasi dipilih dengan tap pin tempat di peta) */
export function EventForm({ initial }: { initial?: WEvent }) {
  const r = useRouter();
  const toast = useToast();
  const s = useSession();
  const [f, setF] = useState({
    name: initial?.name ?? "", description: initial?.description ?? "", faculty: initial?.faculty ?? "Teknik",
    start: toLocalInput(initial?.start), end: toLocalInput(initial?.end), placeId: initial?.placeId ?? places[0].id,
  });
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.start || !f.end) return setErr("Nama dan jadwal wajib diisi");
    if (new Date(f.end) <= new Date(f.start)) return setErr("Waktu selesai harus setelah waktu mulai");
    const ev: WEvent = {
      id: initial?.id ?? `ev-${Date.now()}`, organizerId: initial?.organizerId ?? myOrganizerId(s?.email), poster: initial?.poster ?? "",
      speakers: initial?.speakers ?? [], facilities: initial?.facilities ?? [], name: f.name, description: f.description, faculty: f.faculty,
      start: fromLocalInput(f.start), end: fromLocalInput(f.end), placeId: f.placeId,
    };
    await saveEvent(ev);
    toast("Event tersimpan");
    r.replace(`/panitia/event/${ev.id}`);
  };
  const sel = places.find((p) => p.id === f.placeId);
  return (
    <Screen header={<Header title={initial ? "Edit Event" : "Tambah Event"} />}>
      <form onSubmit={submit} className="space-y-4 pb-4">
        <Field label="Nama event" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label className="block"><span className="mb-2 block text-xs font-medium">Deskripsi</span>
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className="w-full rounded-lg border border-line bg-muted p-3 text-sm outline-none focus:border-primary" /></label>
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line text-xs text-ink-2">Unggah poster (simulasi, belum didukung)</div>
        <label className="block"><span className="mb-2 block text-xs font-medium">Fakultas</span>
          <select value={f.faculty} onChange={(e) => setF({ ...f, faculty: e.target.value })} className="h-12 w-full rounded-lg border border-line bg-muted px-3 text-sm">{faculties.map((x) => <option key={x}>{x}</option>)}</select></label>
        <Field label="Mulai" type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
        <Field label="Selesai" type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
        <div><span className="mb-2 block text-xs font-medium">Lokasi — tap pin di peta: <b>{sel?.name}</b></span>
          <div className="h-48 overflow-hidden rounded-xl border border-line">
            <MapView center={campuses.sudirman.center} zoom={17} markers={places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, cat: p.category, label: p.name, selected: p.id === f.placeId }))} onMarker={(id) => setF({ ...f, placeId: id })} />
          </div></div>
        {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
        <Button type="submit">Simpan</Button>
        <Button type="button" variant="secondary" onClick={() => r.back()}>Batal</Button>
      </form>
    </Screen>
  );
}
