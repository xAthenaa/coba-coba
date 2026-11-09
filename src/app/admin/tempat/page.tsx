"use client";
import { useState } from "react";
import { Guard } from "@/components/Guard";
import { Badge, Button, CatDot, Chip, Empty, Field, Header } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { MapView } from "@/components/MapView";
import { useToast } from "@/components/Toast";
import { ConfirmDelete } from "@/components/AdminConfirm";
import { ApiError, deletePlace, savePlace, usePlaces } from "@/lib/api";
import { campuses } from "@/lib/data";
import { categoryLabel } from "@/lib/tokens";
import type { CampusId, Place } from "@/lib/types";

type Draft = { id?: string; name: string; category: string; campusId: CampusId; lat: string; lng: string; description: string };
const blank = (c: CampusId): Draft => ({ name: "", category: "gedung", campusId: c, lat: String(campuses[c].center.lat), lng: String(campuses[c].center.lng), description: "" });

/** A-04 Kelola Tempat (data master Place): tambah/ubah/hapus. Koordinat bisa dipilih dengan tap peta. */
function Tempat() {
  const [campus, setCampus] = useState<CampusId>("sudirman");
  const { data, isLoading, mutate } = usePlaces(`?campusId=${campus}`);
  const toast = useToast();
  const [d, setD] = useState<Draft | null>(null);
  const [del, setDel] = useState<Place | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const list = data ?? [];
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d) return;
    const lat = Number(d.lat), lng = Number(d.lng);
    if (!d.name.trim()) return setErr("Nama tempat wajib diisi");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return setErr("Koordinat tidak valid");
    setBusy(true); setErr("");
    try {
      await savePlace({ id: d.id, name: d.name, category: d.category.toUpperCase(), campusId: d.campusId, lat, lng, description: d.description || null });
      await mutate(); toast(d.id ? "Tempat diperbarui" : "Tempat ditambahkan"); setD(null);
    } catch (x) { setErr(x instanceof ApiError ? Object.values(x.fields ?? {})[0] ?? x.message : "Gagal menyimpan"); }
    finally { setBusy(false); }
  };
  return (
    <Screen nav header={<Header title="Kelola Tempat" backHref="/admin" />}>
      <div className="flex gap-2">{(Object.keys(campuses) as CampusId[]).map((c) => <Chip key={c} active={campus === c} onClick={() => { setCampus(c); setD(null); }}>{campuses[c].name}</Chip>)}</div>
      {d ? (
        <form onSubmit={save} className="mt-4 space-y-3 rounded-xl border border-line p-4" aria-label="Form tempat">
          <h2 className="text-base font-semibold">{d.id ? "Edit Tempat" : "Tambah Tempat"}</h2>
          <Field label="Nama tempat" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-2 block text-xs font-medium">Kategori</span>
              <select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} className="h-12 w-full rounded-lg border border-line bg-muted px-3 text-sm">
                {Object.entries(categoryLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block"><span className="mb-2 block text-xs font-medium">Kampus</span>
              <select value={d.campusId} onChange={(e) => setD({ ...d, campusId: e.target.value as CampusId })} className="h-12 w-full rounded-lg border border-line bg-muted px-3 text-sm">
                {(Object.keys(campuses) as CampusId[]).map((c) => <option key={c} value={c}>{campuses[c].name}</option>)}</select></label>
            <Field label="Latitude" inputMode="decimal" value={d.lat} onChange={(e) => setD({ ...d, lat: e.target.value })} />
            <Field label="Longitude" inputMode="decimal" value={d.lng} onChange={(e) => setD({ ...d, lng: e.target.value })} />
          </div>
          <p className="text-xs text-ink-2">Tap peta untuk memilih koordinat.</p>
          <div className="h-56 overflow-hidden rounded-xl border border-line">
            <MapView center={Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lng)) ? { lat: Number(d.lat), lng: Number(d.lng) } : campuses[d.campusId].center} zoom={17}
              markers={[{ id: "draft", lat: Number(d.lat) || campuses[d.campusId].center.lat, lng: Number(d.lng) || campuses[d.campusId].center.lng, cat: d.category, label: d.name || "Tempat baru", selected: true }]}
              onMapClick={(ll) => setD((p) => (p ? { ...p, lat: ll.lat.toFixed(6), lng: ll.lng.toFixed(6) } : p))} />
          </div>
          <label className="block"><span className="mb-2 block text-xs font-medium">Deskripsi (opsional)</span>
            <textarea value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} rows={2} className="w-full rounded-lg border border-line bg-muted p-3 text-sm outline-none focus:border-primary" /></label>
          {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
          <div className="grid grid-cols-2 gap-3"><Button type="button" variant="secondary" onClick={() => setD(null)}>Batal</Button><Button type="submit" disabled={busy}>Simpan</Button></div>
        </form>
      ) : <div className="mt-4"><Button onClick={() => { setErr(""); setD(blank(campus)); }}>+ Tempat</Button></div>}
      <ul className="mt-4 space-y-2 pb-4">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
            <CatDot cat={p.category} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.name}</p><p className="text-xs text-ink-2">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</p></div>
            <Badge tone="gray">{categoryLabel[p.category]}</Badge>
            <button type="button" className="text-xs font-semibold text-primary" onClick={() => { setErr(""); setD({ id: p.id, name: p.name, category: p.category, campusId: p.campus, lat: String(p.lat), lng: String(p.lng), description: p.description ?? "" }); }}>Edit</button>
            <button type="button" aria-label={`Hapus tempat ${p.name}`} className="text-xs font-semibold text-danger" onClick={() => setDel(p)}>Hapus</button>
          </li>
        ))}
      </ul>
      {!isLoading && !list.length && <Empty title="Belum ada tempat" />}
      <ConfirmDelete item={del} onClose={() => setDel(null)} title="Hapus tempat?" done="Tempat dihapus"
        body={<>&ldquo;{del?.name}&rdquo; akan dihapus dari peta. Tempat yang masih dipakai event tidak bisa dihapus.</>}
        onConfirm={async () => { if (del) { await deletePlace(del.id); await mutate(); } }} />
    </Screen>
  );
}
export default function Page() { return <Guard allow={["admin"]} msg="Halaman khusus admin"><Tempat /></Guard>; }
