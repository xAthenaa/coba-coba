"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Header } from "./ui";
import { Screen } from "./Screen";
import { Icon } from "./Icon";
import { MapView } from "./MapView";
import { useToast } from "./Toast";
import { ApiError, deleteProposal, saveEvent, uploadPoster, uploadProposal, usePlaces, type UIEvent } from "@/lib/api";
import { campuses, faculties } from "@/lib/data";
import { fromLocalInput, toLocalInput } from "@/lib/panitia";

/** P-02 Tambah/Edit Event (lokasi dipilih dengan tap pin tempat di peta) + kuota peserta + surat pengajuan (PDF, privat).
 *  `afterSave` = tujuan setelah simpan (default detail event panitia); `backHref` untuk header (admin). */
export function EventForm({ initial, afterSave, children }: { initial?: UIEvent; afterSave?: (id: string) => string; children?: React.ReactNode }) {
  const r = useRouter();
  const toast = useToast();
  const { data: places = [] } = usePlaces();
  const [f, setF] = useState({
    name: initial?.name ?? "", description: initial?.description ?? "", faculty: initial?.faculty ?? "Teknik",
    start: toLocalInput(initial?.start), end: toLocalInput(initial?.end), placeId: initial?.placeId ?? "", poster: initial?.poster ?? "",
    quota: initial?.quota ? String(initial.quota) : "",
  });
  const [pdf, setPdf] = useState<File | null>(null);
  const [proposal, setProposal] = useState(initial?.proposal ?? null);
  const onPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (file.type && file.type !== "application/pdf") return setErr("Surat pengajuan harus PDF");
    if (file.size > 5 * 1024 * 1024) return setErr("Ukuran surat pengajuan maksimal 5 MB");
    setErr(""); setPdf(file);
  };
  const [uploading, setUploading] = useState(false);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setErr("Poster harus JPG, PNG, atau WEBP");
    if (file.size > 2 * 1024 * 1024) return setErr("Ukuran poster maksimal 2 MB");
    setUploading(true); setErr("");
    try { const url = await uploadPoster(file); setF((p) => ({ ...p, poster: url })); }
    catch (x) { setErr(x instanceof Error ? x.message : "Gagal mengunggah poster"); }
    finally { setUploading(false); }
  };
  /** Tap titik mana pun di peta → pilih tempat terdekat (sama seperti tap pin). */
  const onMapClick = (ll: { lat: number; lng: number }) => {
    let best: string | null = null, bd = Infinity;
    for (const p of places) { const d = (p.lat - ll.lat) ** 2 + ((p.lng - ll.lng) * Math.cos((ll.lat * Math.PI) / 180)) ** 2; if (d < bd) { bd = d; best = p.id; } }
    if (best) setF((p) => ({ ...p, placeId: best }));
  };
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.start || !f.end) return setErr("Nama dan jadwal wajib diisi");
    if (new Date(f.end) <= new Date(f.start)) return setErr("Waktu selesai harus setelah waktu mulai");
    if (!f.placeId) return setErr("Pilih lokasi dengan tap di peta");
    if (uploading) return setErr("Tunggu unggahan poster selesai");
    const quota = f.quota.trim() ? Number(f.quota) : null;
    if (quota !== null && (!Number.isInteger(quota) || quota < 1)) return setErr("Kuota harus bilangan bulat ≥ 1 (kosongkan bila tanpa batas)");
    try {
      const ev = await saveEvent({
        id: initial?.id, poster: f.poster, speakers: initial?.speakers ?? [], facilities: initial?.facilities ?? [], quota,
        name: f.name, description: f.description, faculty: f.faculty, start: fromLocalInput(f.start), end: fromLocalInput(f.end), placeId: f.placeId,
      });
      if (pdf) {
        try { await uploadProposal(ev.id, pdf); }
        catch (x) { toast(`Event tersimpan, tetapi surat pengajuan gagal diunggah: ${x instanceof Error ? x.message : ""}`, "error"); r.replace(afterSave ? afterSave(ev.id) : `/panitia/event/${ev.id}/edit`); return; }
      }
      toast("Event tersimpan");
      r.replace(afterSave ? afterSave(ev.id) : `/panitia/event/${ev.id}`);
    } catch (x) {
      setErr(x instanceof ApiError ? Object.values(x.fields ?? {})[0] ?? x.message : "Gagal menyimpan");
    }
  };
  const sel = places.find((p) => p.id === f.placeId);
  return (
    <Screen header={<Header title={initial ? "Edit Event" : "Tambah Event"} />}>
      <form onSubmit={submit} className="space-y-4 pb-4">
        <Field label="Nama event" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label className="block"><span className="mb-2 block text-xs font-medium">Deskripsi</span>
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className="w-full rounded-lg border border-line bg-muted p-3 text-sm outline-none focus:border-primary" /></label>
        <div><span className="mb-2 block text-xs font-medium">Poster (JPG/PNG/WEBP, maks 2 MB)</span>
          <label className="flex min-h-24 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-line text-xs text-ink-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.poster ? <img src={f.poster} alt="Pratinjau poster" className="max-h-60 w-full object-cover" /> : <span>{uploading ? "Mengunggah…" : "Tap untuk unggah poster"}</span>}
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Unggah poster" onChange={onFile} className="sr-only" />
          </label>
          {f.poster && <div className="mt-1 flex gap-3 text-xs">{uploading ? <span className="text-ink-2">Mengunggah…</span> : <span className="text-ink-2">Tap gambar untuk mengganti</span>}
            <button type="button" onClick={() => setF({ ...f, poster: "" })} className="font-medium text-danger">Hapus poster</button></div>}</div>
        <label className="block"><span className="mb-2 block text-xs font-medium">Fakultas</span>
          <select value={f.faculty} onChange={(e) => setF({ ...f, faculty: e.target.value })} className="h-12 w-full rounded-lg border border-line bg-muted px-3 text-sm">{faculties.map((x) => <option key={x}>{x}</option>)}</select></label>
        <Field label="Mulai" type="datetime-local" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} />
        <Field label="Selesai" type="datetime-local" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />
        <div>
          <Field label="Kuota peserta (kosongkan bila tanpa batas)" type="number" min={1} inputMode="numeric" value={f.quota} onChange={(e) => setF({ ...f, quota: e.target.value })} placeholder="mis. 100" />
          {initial && (initial.registrantCount ?? 0) > 0 && <p className="mt-1 text-xs text-ink-2">Sudah ada {initial.registrantCount} pendaftar.</p>}
        </div>
        <div><span className="mb-2 block text-xs font-medium">Surat pengajuan event (PDF, maks 5 MB — hanya panitia & admin)</span>
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 text-xs text-ink-2">
            <Icon name="download" size={16} />{pdf ? pdf.name : proposal ? "Tap untuk mengganti surat" : "Tap untuk unggah surat pengajuan"}
            <input type="file" accept="application/pdf" aria-label="Unggah surat pengajuan" onChange={onPdf} className="sr-only" />
          </label>
          {pdf && <p className="mt-1 text-xs text-ink-2">Akan diunggah saat disimpan. <button type="button" className="font-medium text-danger" onClick={() => setPdf(null)}>Batal</button></p>}
          {!pdf && proposal && initial && <div className="mt-1 flex gap-3 text-xs">
            <a href={proposal.url} target="_blank" rel="noreferrer" className="font-medium text-primary underline">Lihat {proposal.name}</a>
            <button type="button" className="font-medium text-danger" onClick={async () => { try { await deleteProposal(initial.id); setProposal(null); toast("Surat pengajuan dihapus"); } catch (x) { setErr(x instanceof Error ? x.message : "Gagal menghapus"); } }}>Hapus surat</button>
          </div>}
        </div>
        <div><span className="mb-2 block text-xs font-medium">Lokasi — tap di peta: <b>{sel?.name ?? "belum dipilih"}</b></span>
          <div className="h-80 overflow-hidden rounded-xl border border-line">
            <MapView center={campuses.sudirman.center} zoom={17} markers={places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, cat: p.category, label: p.name, selected: p.id === f.placeId }))} onMarker={(id) => setF((p) => ({ ...p, placeId: id }))} onMapClick={onMapClick} />
          </div>
          <select aria-label="Pilih lokasi dari daftar" value={f.placeId} onChange={(e) => setF({ ...f, placeId: e.target.value })} className="mt-2 h-12 w-full rounded-lg border border-line bg-muted px-3 text-sm">
            <option value="">atau pilih dari daftar…</option>
            {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
        {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
        <Button type="submit">Simpan</Button>
        <Button type="button" variant="secondary" onClick={() => r.back()}>Batal</Button>
      </form>
      {children}
    </Screen>
  );
}
