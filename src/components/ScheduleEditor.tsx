"use client";
import { useState } from "react";
import { Button, Empty, Field, Modal } from "./ui";
import { useToast } from "./Toast";
import { ApiError, deleteSchedule, saveSchedule } from "@/lib/api";
import { fmtDate, fmtTime } from "@/lib/data";
import { fromLocalInput, toLocalInput } from "@/lib/panitia";
import type { ScheduleItem } from "@/lib/types";

type Draft = { id?: string; title: string; start: string; end: string; speaker: string; location: string };
const blank = (d?: string): Draft => ({ title: "", start: toLocalInput(d), end: toLocalInput(d), speaker: "", location: "" });

/** Daftar jadwal/rundown (terpisah dari info event): tampil di detail event. */
export function ScheduleList({ items }: { items: ScheduleItem[] }) {
  return (
    <ol className="space-y-2">
      {items.map((s) => (
        <li key={s.id} className="flex gap-3 rounded-xl border border-line p-3">
          <div className="w-24 shrink-0 text-xs font-semibold text-primary">{fmtTime(s.start)}–{fmtTime(s.end)}<span className="block font-normal text-ink-2">{fmtDate(s.start)}</span></div>
          <div className="min-w-0 flex-1 text-sm"><p className="font-semibold">{s.title}</p>
            {(s.speaker || s.location) && <p className="text-xs text-ink-2">{[s.speaker, s.location].filter(Boolean).join(" · ")}</p>}</div>
        </li>
      ))}
    </ol>
  );
}

/** CRUD jadwal kegiatan untuk panitia pemilik / admin. */
export function ScheduleEditor({ eventId, items, eventStart }: { eventId: string; items: ScheduleItem[]; eventStart?: string }) {
  const toast = useToast();
  const [d, setD] = useState<Draft | null>(null);
  const [del, setDel] = useState<ScheduleItem | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d) return;
    if (!d.title.trim() || !d.start || !d.end) return setErr("Judul, mulai, dan selesai wajib diisi");
    if (new Date(d.end) <= new Date(d.start)) return setErr("Waktu selesai harus setelah waktu mulai");
    setBusy(true); setErr("");
    try { await saveSchedule(eventId, { ...d, start: fromLocalInput(d.start), end: fromLocalInput(d.end) }); toast(d.id ? "Jadwal diperbarui" : "Jadwal ditambahkan"); setD(null); }
    catch (x) { setErr(x instanceof ApiError ? Object.values(x.fields ?? {})[0] ?? x.message : "Gagal menyimpan jadwal"); }
    finally { setBusy(false); }
  };
  return (
    <section aria-label="Jadwal kegiatan" className="space-y-3 pb-4">
      <div className="flex items-center"><h2 className="flex-1 text-base font-semibold">Jadwal Kegiatan</h2>
        <button type="button" onClick={() => { setErr(""); setD(blank(eventStart)); }} className="rounded-lg border border-primary px-3 py-1 text-xs font-semibold text-primary">+ Tambah Jadwal</button></div>
      {!items.length && <Empty title="Belum ada jadwal" sub="Tambahkan rundown kegiatan (sesi, narasumber, ruangan)." />}
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="rounded-xl border border-line p-3">
            <p className="text-sm font-semibold">{s.title}</p>
            <p className="text-xs text-ink-2">{fmtDate(s.start)} · {fmtTime(s.start)}–{fmtTime(s.end)} WITA{s.speaker ? ` · ${s.speaker}` : ""}{s.location ? ` · ${s.location}` : ""}</p>
            <div className="mt-2 flex gap-3 text-xs font-semibold">
              <button type="button" className="text-primary" onClick={() => { setErr(""); setD({ id: s.id, title: s.title, start: toLocalInput(s.start), end: toLocalInput(s.end), speaker: s.speaker ?? "", location: s.location ?? "" }); }}>Edit</button>
              <button type="button" className="text-danger" aria-label={`Hapus jadwal ${s.title}`} onClick={() => setDel(s)}>Hapus</button>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={!!d} onClose={() => !busy && setD(null)}>
        {d && <form onSubmit={save} className="space-y-3">
          <h2 className="text-lg font-semibold">{d.id ? "Edit Jadwal" : "Tambah Jadwal"}</h2>
          <Field label="Judul sesi" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
          <Field label="Mulai" type="datetime-local" value={d.start} onChange={(e) => setD({ ...d, start: e.target.value })} />
          <Field label="Selesai" type="datetime-local" value={d.end} onChange={(e) => setD({ ...d, end: e.target.value })} />
          <Field label="Pembicara (opsional)" value={d.speaker} onChange={(e) => setD({ ...d, speaker: e.target.value })} />
          <Field label="Lokasi/ruang (opsional)" value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })} />
          {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
          <div className="grid grid-cols-2 gap-3"><Button type="button" variant="secondary" onClick={() => setD(null)}>Batal</Button><Button type="submit" disabled={busy}>Simpan</Button></div>
        </form>}
      </Modal>
      <Modal open={!!del} onClose={() => !busy && setDel(null)}>
        <h2 className="text-lg font-semibold">Hapus jadwal?</h2>
        <p className="mt-1 text-sm text-ink-2">&ldquo;{del?.title}&rdquo; akan dihapus dari rundown.</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => setDel(null)}>Batal</Button>
          <Button variant="danger" disabled={busy} onClick={async () => { if (!del) return; setBusy(true); try { await deleteSchedule(eventId, del.id); toast("Jadwal dihapus"); } catch (x) { toast(x instanceof Error ? x.message : "Gagal menghapus", "error"); } finally { setBusy(false); setDel(null); } }}>Hapus</Button></div>
      </Modal>
    </section>
  );
}
