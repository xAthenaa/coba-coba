"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Guard } from "@/components/Guard";
import { Header, Button, Badge, CatDot, Empty } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { Icon } from "@/components/Icon";
import { useDB } from "@/lib/api";
import { fmtDate, fmtTime, pinStatus } from "@/lib/data";
import { categoryLabel } from "@/lib/tokens";

/** P-04 Daftar Pin (badge tipe + status Aktif/Terjadwal/Kedaluwarsa). Toast P-04b/P-04c tampil setelah simpan/hapus. */
function Pins() {
  const { id } = useParams<{ id: string }>();
  const db = useDB();
  const pins = db.pins.filter((p) => p.eventId === id);
  return (
    <Screen header={<Header title="Daftar Pin" backHref={`/panitia/event/${id}`} />}>
      <Button href={`/panitia/event/${id}/pin/baru`}><Icon name="plus" size={18} />Pin</Button>
      <ul className="mt-4 space-y-3 pb-4">
        {pins.map((p) => {
          const st = pinStatus(p);
          return (
            <li key={p.id}><Link href={`/panitia/event/${id}/pin/${p.id}`} className={`block rounded-xl border border-line p-4 ${st === "Kedaluwarsa" ? "bg-muted" : ""}`}>
              <div className="flex items-center gap-2"><CatDot cat={p.category} /><span className="flex-1 text-sm font-semibold">{p.label}</span><Icon name="chevron" size={18} className="text-ink-2" /></div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={p.type === "timed" ? "amber" : "primary"}>{p.type === "timed" ? "Berbasis waktu" : "Permanen"}</Badge>
                <Badge tone={st === "Aktif" ? "green" : st === "Terjadwal" ? "primary" : "red"}>{st}</Badge>
                <Badge tone="gray">{categoryLabel[p.category]}</Badge>
              </div>
              {p.type === "timed" && p.start && p.end && <p className="mt-2 text-xs text-ink-2">{fmtDate(p.start)} {fmtTime(p.start)} – {fmtDate(p.end)} {fmtTime(p.end)} WITA</p>}
            </Link></li>
          );
        })}
      </ul>
      {!pins.length && <Empty title="Belum ada pin" sub="Tambahkan pin untuk event ini." />}
    </Screen>
  );
}
export default function Page() { return <Guard allow={["panitia"]}><Pins /></Guard>; }
