"use client";
import { useState } from "react";
import { Guard } from "@/components/Guard";
import { Badge, Button, Empty, Field, Header } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { useToast } from "@/components/Toast";
import { ConfirmDelete } from "@/components/AdminConfirm";
import { ApiError, deleteFacility, saveFacility, useFacilities, usePlaces, type Facility } from "@/lib/api";

const FACILITY_LABEL: Record<string, string> = { TOILET: "Toilet", PARKIR: "Parkir", KANTIN: "Kantin", IBADAH: "Tempat ibadah", KESEHATAN: "Kesehatan", WIFI: "Wi-Fi", ATM: "ATM", LAINNYA: "Lainnya" };
type Draft = { id?: string; name: string; category: string; description: string; placeId: string; available: boolean };

/** A-05 Kelola Fasilitas (data master, mandiri oleh Admin). */
function Fasilitas() {
  const { data, isLoading, mutate } = useFacilities();
  const { data: places = [] } = usePlaces();
  const toast = useToast();
  const [d, setD] = useState<Draft | null>(null);
  const [del, setDel] = useState<Facility | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const list = data ?? [];
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d) return;
    if (!d.name.trim()) return setErr("Nama fasilitas wajib diisi");
    setBusy(true); setErr("");
    try { await saveFacility({ id: d.id, name: d.name, category: d.category, description: d.description, placeId: d.placeId || null, available: d.available }); await mutate(); toast(d.id ? "Fasilitas diperbarui" : "Fasilitas ditambahkan"); setD(null); }
    catch (x) { setErr(x instanceof ApiError ? Object.values(x.fields ?? {})[0] ?? x.message : "Gagal menyimpan"); }
    finally { setBusy(false); }
  };
  return (
    <Screen nav header={<Header title="Kelola Fasilitas" backHref="/admin" />}>
      {d ? (
        <form onSubmit={save} className="space-y-3 rounded-xl border border-line p-4" aria-label="Form fasilitas">
          <h2 className="text-base font-semibold">{d.id ? "Edit Fasilitas" : "Tambah Fasilitas"}</h2>
          <Field label="Nama fasilitas" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
          <label className="block"><span className="mb-2 block text-xs font-medium">Jenis</span>
            <select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} className="h-12 w-full rounded-lg border border-line bg-muted px-3 text-sm">
              {Object.entries(FACILITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-xs font-medium">Lokasi (tempat)</span>
            <select value={d.placeId} onChange={(e) => setD({ ...d, placeId: e.target.value })} className="h-12 w-full rounded-lg border border-line bg-muted px-3 text-sm">
              <option value="">— tanpa lokasi —</option>{places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-xs font-medium">Keterangan</span>
            <textarea value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} rows={2} className="w-full rounded-lg border border-line bg-muted p-3 text-sm outline-none focus:border-primary" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.available} onChange={(e) => setD({ ...d, available: e.target.checked })} />Tersedia / dapat digunakan</label>
          {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
          <div className="grid grid-cols-2 gap-3"><Button type="button" variant="secondary" onClick={() => setD(null)}>Batal</Button><Button type="submit" disabled={busy}>Simpan</Button></div>
        </form>
      ) : <Button onClick={() => { setErr(""); setD({ name: "", category: "TOILET", description: "", placeId: "", available: true }); }}>+ Fasilitas</Button>}
      <ul className="mt-4 space-y-2 pb-4">
        {list.map((f) => (
          <li key={f.id} className={`rounded-xl border border-line p-3 ${f.available ? "" : "bg-muted"}`}>
            <div className="flex items-center gap-2"><p className="flex-1 text-sm font-semibold">{f.name}</p><Badge tone="gray">{FACILITY_LABEL[f.category] ?? f.category}</Badge>{!f.available && <Badge tone="red">Tidak tersedia</Badge>}</div>
            <p className="mt-1 text-xs text-ink-2">{f.place?.name ?? "Tanpa lokasi"}{f.description ? ` · ${f.description}` : ""}</p>
            <div className="mt-2 flex gap-3 text-xs font-semibold">
              <button type="button" className="text-primary" onClick={() => { setErr(""); setD({ id: f.id, name: f.name, category: f.category, description: f.description, placeId: f.placeId ?? "", available: f.available }); }}>Edit</button>
              <button type="button" aria-label={`Hapus fasilitas ${f.name}`} className="text-danger" onClick={() => setDel(f)}>Hapus</button>
            </div>
          </li>
        ))}
      </ul>
      {!isLoading && !list.length && <Empty title="Belum ada fasilitas" />}
      <ConfirmDelete item={del} onClose={() => setDel(null)} title="Hapus fasilitas?" done="Fasilitas dihapus" body={<>&ldquo;{del?.name}&rdquo; akan dihapus dari data master.</>}
        onConfirm={async () => { if (del) { await deleteFacility(del.id); await mutate(); } }} />
    </Screen>
  );
}
export default function Page() { return <Guard allow={["admin"]} msg="Halaman khusus admin"><Fasilitas /></Guard>; }
