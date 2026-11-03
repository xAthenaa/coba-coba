"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Guard } from "@/components/Guard";
import { Header, Button, Badge, Modal, Empty } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { Poster } from "@/components/Poster";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { deleteEvent, useEvent, useEventPins } from "@/lib/api";
import { eventStatus, fmtRange, pinStatus } from "@/lib/data";

/** P-03 Detail Event Panitia · P-07 Konfirmasi Hapus Event (overlay) */
function Detail() {
  const { id } = useParams<{ id: string }>();
  const { data: e, isLoading } = useEvent(id);
  const { data: pinData } = useEventPins(id);
  const r = useRouter();
  const toast = useToast();
  const [del, setDel] = useState(false);
  if (isLoading) return <Screen header={<Header title="Detail Event" backHref="/panitia" />}><p className="text-sm text-ink-2">Memuat…</p></Screen>;
  if (!e) return <Screen header={<Header title="Detail Event" backHref="/panitia" />}><Empty title="Event tidak ditemukan" /></Screen>;
  const pins = pinData ?? [];
  const st = eventStatus(e);
  return (
    <Screen nav header={<Header title="Detail Event" backHref="/panitia" />}>
      <Poster e={e} className="h-40 rounded-xl" />
      <div className="mt-4 flex gap-2"><Badge tone={st === "selesai" ? "gray" : st === "berlangsung" ? "green" : "primary"}>{st}</Badge><Badge>{e.faculty}</Badge></div>
      <h2 className="mt-2 text-xl font-semibold">{e.name}</h2>
      <p className="mt-1 text-sm text-ink-2">{fmtRange(e.start, e.end)}</p>
      <p className="text-sm text-ink-2">{e.place?.name}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-soft p-3"><p className="text-lg font-bold text-primary">{pins.length}</p><p className="text-xs text-ink-2">Pin</p></div>
        <div className="rounded-xl bg-soft p-3"><p className="text-lg font-bold text-primary">{pins.filter((p) => pinStatus(p) === "Aktif").length}</p><p className="text-xs text-ink-2">Aktif</p></div>
        <div className="rounded-xl bg-soft p-3"><p className="text-lg font-bold text-primary">{e.registrantCount ?? 0}</p><p className="text-xs text-ink-2">Pendaftar</p></div>
      </div>
      <div className="mt-5 space-y-3 pb-4">
        <Button href={`/panitia/event/${e.id}/pin`}><Icon name="pin" size={18} />Kelola Pin</Button>
        <Button variant="secondary" href={`/panitia/event/${e.id}/qr`}><Icon name="qr" size={18} />QR Peta</Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" href={`/panitia/event/${e.id}/edit`}><Icon name="edit" size={18} />Edit</Button>
          <Button variant="secondary" className="!border-danger !text-danger" onClick={() => setDel(true)}><Icon name="trash" size={18} />Hapus</Button>
        </div>
      </div>
      <Modal open={del} onClose={() => setDel(false)}>
        <h2 className="text-lg font-semibold">Hapus event?</h2>
        <p className="mt-1 text-sm text-ink-2">“{e.name}” beserta {pins.length} pin dan QR Peta-nya akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setDel(false)}>Batal</Button>
          <Button variant="danger" onClick={async () => { try { await deleteEvent(e.id); toast("Event dihapus"); r.replace("/panitia"); } catch (x) { toast(x instanceof Error ? x.message : "Gagal menghapus", "error"); } }}>Hapus</Button>
        </div>
      </Modal>
    </Screen>
  );
}
export default function Page() { return <Guard allow={["panitia"]}><Detail /></Guard>; }
