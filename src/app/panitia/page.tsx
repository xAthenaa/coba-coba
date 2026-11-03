"use client";
import Link from "next/link";
import { Guard } from "@/components/Guard";
import { Header, Button, Badge, Empty } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { Icon } from "@/components/Icon";
import { useEvents } from "@/lib/api";
import { eventStatus, fmtDate } from "@/lib/data";

/** P-01 Kelola — event milik saya + status */
function Kelola() {
  const { data, isLoading } = useEvents("?mine=1");
  const mine = data ?? [];
  return (
    <Screen nav header={<Header title="Kelola Event" back={false} />}>
      <Button href="/panitia/event/baru"><Icon name="plus" size={18} />Event</Button>
      <ul className="mt-4 space-y-3 pb-4">
        {mine.map((e) => {
          const st = eventStatus(e);
          return (
            <li key={e.id}><Link href={`/panitia/event/${e.id}`} className="block rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold">{e.name}</h3>
                <Badge tone={st === "selesai" ? "gray" : st === "berlangsung" ? "green" : "primary"}>{st === "selesai" ? "Selesai" : st === "berlangsung" ? "Berlangsung" : "Terjadwal"}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-2">{fmtDate(e.start)} · {e.place?.name ?? "-"}</p>
              <p className="mt-1 text-xs text-ink-2">{e.registrantCount ?? 0} pendaftar</p>
            </Link></li>
          );
        })}
      </ul>
      {!isLoading && !mine.length && <Empty title="Belum ada event" sub="Tekan + Event untuk membuat." />}
    </Screen>
  );
}
export default function Page() { return <Guard allow={["panitia"]} msg="Halaman khusus panitia"><Kelola /></Guard>; }
