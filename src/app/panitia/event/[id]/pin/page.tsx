"use client";
import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Guard } from "@/components/Guard";
import { Header, Button, Badge, CatDot, Empty, Modal } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { Screen } from "@/components/Screen";
import { Icon } from "@/components/Icon";
import { ApiError, deletePin, useEventPins } from "@/lib/api";
import { fmtDate, fmtTime, pinStatus } from "@/lib/data";
import { categoryLabel } from "@/lib/tokens";

/** P-04 Daftar Pin (badge tipe + status Aktif/Terjadwal/Kedaluwarsa). Toast P-04b/P-04c tampil setelah simpan/hapus. */
function Pins() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useEventPins(id);
  const pins = data ?? [];
  const toast = useToast();
  const [del, setDel] = useState<{ id: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    try { await deletePin(del.id, id); toast("Pin dihapus"); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Gagal menghapus pin"); }
    finally { setBusy(false); setDel(null); }
  }
  return (
    <Screen header={<Header title="Daftar Pin" backHref={`/panitia/event/${id}`} />}>
      <Button href={`/panitia/event/${id}/pin/baru`}><Icon name="plus" size={18} />Pin</Button>
      <ul className="mt-4 space-y-3 pb-4">
        {pins.map((p) => {
          const st = pinStatus(p);
          return (
            <li key={p.id} className={`relative rounded-xl border border-line ${st === "Kedaluwarsa" ? "bg-muted" : ""}`}><Link href={`/panitia/event/${id}/pin/${p.id}`} className="block p-4 pr-24">
              <div className="flex items-center gap-2"><CatDot cat={p.category} /><span className="flex-1 text-sm font-semibold">{p.label}</span><Icon name="chevron" size={18} className="text-ink-2" /></div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={p.type === "timed" ? "amber" : "primary"}>{p.type === "timed" ? "Berbasis waktu" : "Permanen"}</Badge>
                <Badge tone={st === "Aktif" ? "green" : st === "Terjadwal" ? "primary" : "red"}>{st}</Badge>
                <Badge tone="gray">{categoryLabel[p.category]}</Badge>
              </div>
              {p.type === "timed" && p.start && p.end && <p className="mt-2 text-xs text-ink-2">{fmtDate(p.start)} {fmtTime(p.start)} – {fmtDate(p.end)} {fmtTime(p.end)} WITA</p>}
            </Link>
              <button type="button" aria-label={`Hapus pin ${p.label}`} onClick={() => setDel({ id: p.id, label: p.label })}
                className="absolute right-3 bottom-3 rounded-lg border border-danger px-3 py-1 text-xs font-semibold text-danger hover:bg-danger hover:text-white">Hapus</button>
            </li>
          );
        })}
      </ul>
      {!isLoading && !pins.length && <Empty title="Belum ada pin" sub="Tambahkan pin untuk event ini." />}
      <Modal open={!!del} onClose={() => !busy && setDel(null)}>
        <h2 className="text-lg font-semibold">Hapus pin ini?</h2>
        <p className="mt-1 text-sm text-ink-2">Pin &ldquo;{del?.label}&rdquo; akan dihapus permanen dari peta.</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><Button variant="secondary" disabled={busy} onClick={() => setDel(null)}>Batal</Button><Button variant="danger" disabled={busy} onClick={confirmDelete}>Hapus</Button></div>
      </Modal>
    </Screen>
  );
}
export default function Page() { return <Guard allow={["panitia"]}><Pins /></Guard>; }
