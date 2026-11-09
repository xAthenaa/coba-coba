"use client";
import Link from "next/link";
import { useState } from "react";
import { Guard } from "@/components/Guard";
import { Badge, Empty, Header } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { ConfirmDelete } from "@/components/AdminConfirm";
import { deleteEvent, useAdminEvents, type UIEvent } from "@/lib/api";
import { eventStatus, fmtDate } from "@/lib/data";

/** A-03 Kelola Semua Event — ubah (form yang sama dengan panitia) & hapus. */
function Events() {
  const { data, isLoading, mutate } = useAdminEvents();
  const [del, setDel] = useState<UIEvent | null>(null);
  const list = data ?? [];
  return (
    <Screen nav header={<Header title="Kelola Event" backHref="/admin" />}>
      <ul className="space-y-3 pb-4">
        {list.map((e) => {
          const st = eventStatus(e);
          return (
            <li key={e.id} className="rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-2"><h3 className="text-base font-semibold">{e.name}</h3>
                <Badge tone={st === "selesai" ? "gray" : st === "berlangsung" ? "green" : "primary"}>{st === "selesai" ? "Selesai" : st === "berlangsung" ? "Berlangsung" : "Terjadwal"}</Badge></div>
              <p className="mt-1 text-xs text-ink-2">{fmtDate(e.start)} · {e.place?.name ?? "-"} · {e.organizerName}</p>
              <p className="mt-1 text-xs text-ink-2">{e.registrantCount ?? 0}{e.quota ? `/${e.quota}` : ""} pendaftar · {e.schedule.length} jadwal · surat: {e.proposal ? <a className="font-medium text-primary underline" href={e.proposal.url} target="_blank" rel="noreferrer">{e.proposal.name}</a> : "belum ada"}</p>
              <div className="mt-3 flex gap-2 text-xs font-semibold">
                <Link href={`/event/${e.id}`} className="rounded-lg border border-line px-3 py-1.5">Lihat</Link>
                <Link href={`/admin/event/${e.id}`} className="rounded-lg border border-primary px-3 py-1.5 text-primary">Edit</Link>
                <button type="button" aria-label={`Hapus event ${e.name}`} onClick={() => setDel(e)} className="rounded-lg border border-danger px-3 py-1.5 text-danger">Hapus</button>
              </div>
            </li>
          );
        })}
      </ul>
      {!isLoading && !list.length && <Empty title="Belum ada event" />}
      <ConfirmDelete item={del} onClose={() => setDel(null)} title="Hapus event?" done="Event dihapus"
        body={<>&ldquo;{del?.name}&rdquo; beserta pin, jadwal, pendaftaran, dan QR Peta-nya akan terhapus permanen.</>}
        onConfirm={async () => { if (del) { await deleteEvent(del.id); await mutate(); } }} />
    </Screen>
  );
}
export default function Page() { return <Guard allow={["admin"]} msg="Halaman khusus admin"><Events /></Guard>; }
