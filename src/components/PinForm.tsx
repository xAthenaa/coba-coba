"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Header, Modal, Toggle2, Chip } from "./ui";
import { Screen } from "./Screen";
import { MapView } from "./MapView";
import { useToast } from "./Toast";
import { deletePin, savePin } from "@/lib/api";
import { campuses } from "@/lib/data";
import { fromLocalInput, toLocalInput } from "@/lib/panitia";
import { tokens, categoryLabel } from "@/lib/tokens";
import type { Category, Pin } from "@/lib/types";

/** P-05 Tambah Pin Berbasis Waktu · P-05b Pin Permanen · P-08 Hapus Pin (overlay) */
export function PinForm({ eventId, initial }: { eventId: string; initial?: Pin }) {
  const r = useRouter();
  const toast = useToast();
  const [pt, setPt] = useState(initial ? { lat: initial.lat, lng: initial.lng } : null as null | { lat: number; lng: number });
  const [label, setLabel] = useState(initial?.label ?? "");
  const [cat, setCat] = useState<Category>(initial?.category ?? "event");
  const [type, setType] = useState<Pin["type"]>(initial?.type ?? "timed");
  const [start, setStart] = useState(toLocalInput(initial?.start));
  const [end, setEnd] = useState(toLocalInput(initial?.end));
  const [err, setErr] = useState("");
  const [del, setDel] = useState(false);
  const back = `/panitia/event/${eventId}/pin`;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pt) return setErr("Tap peta untuk menentukan titik pin");
    if (!label) return setErr("Label wajib diisi");
    if (type === "timed" && (!start || !end)) return setErr("Tanggal-jam pasang & hapus wajib untuk pin berbasis waktu");
    if (type === "timed" && new Date(end) <= new Date(start)) return setErr("Waktu hapus harus setelah waktu pasang");
    try {
      await savePin({ id: initial?.id ?? `pin-${Date.now()}`, eventId, label, category: cat, type, ...pt, ...(type === "timed" ? { start: fromLocalInput(start), end: fromLocalInput(end) } : {}) });
      toast("Pin tersimpan"); r.replace(back);
    } catch (x) { setErr((x as Error).message); }
  };
  return (
    <Screen header={<Header title={initial ? "Edit Pin" : "Tambah Pin"} backHref={back} />} padded={false}>
      <div className="relative h-60">
        <MapView center={pt ?? campuses.sudirman.center} zoom={18} onMapClick={setPt} markers={pt ? [{ id: "new", ...pt, cat, label: label || "Pin baru", selected: true }] : []} />
        <p className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] rounded-lg bg-white/95 px-3 py-2 text-center text-xs font-medium">{pt ? `Titik: ${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)} — tap untuk memindah` : "Tap peta untuk memilih titik"}</p>
      </div>
      <form onSubmit={submit} className="space-y-4 px-6 py-4">
        <Field label="Label pin" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Booth Registrasi" />
        <div><span className="mb-2 block text-xs font-medium">Kategori</span>
          <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">{(Object.keys(categoryLabel) as Category[]).map((c) => <Chip key={c} active={cat === c} color={tokens.category[c]} onClick={() => setCat(c)}>{categoryLabel[c]}</Chip>)}</div></div>
        <div><span className="mb-2 block text-xs font-medium">Tipe pin</span>
          <Toggle2 value={type} onChange={setType} options={[{ v: "timed", label: "Berbasis waktu" }, { v: "permanent", label: "Permanen" }]} /></div>
        {type === "timed" ? <>
          <Field label="Tanggal-jam pasang (wajib)" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          <Field label="Tanggal-jam hapus (wajib, setelah pasang)" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          <p className="text-xs text-ink-2">Pin otomatis hilang dari peta pengunjung setelah waktu hapus.</p>
        </> : <p className="rounded-lg bg-soft p-3 text-xs text-ink-2">Pin permanen tampil tanpa batas waktu (mis. stand mahasiswa) dan hanya bisa dihapus manual.</p>}
        {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
        <Button type="submit">Simpan</Button>
        {initial && <Button type="button" variant="secondary" className="!border-danger !text-danger" onClick={() => setDel(true)}>Hapus Pin</Button>}
      </form>
      <Modal open={del} onClose={() => setDel(false)}>
        <h2 className="text-lg font-semibold">Hapus pin?</h2>
        <p className="mt-1 text-sm text-ink-2">“{label}” akan hilang dari peta pengunjung.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setDel(false)}>Batal</Button>
          <Button variant="danger" onClick={async () => { await deletePin(initial!.id); toast("Pin dihapus"); r.replace(back); }}>Hapus</Button>
        </div>
      </Modal>
    </Screen>
  );
}
