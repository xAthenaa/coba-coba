"use client";
import Link from "next/link";
import { Header } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { Icon } from "@/components/Icon";
import { notifications, fmtDate, fmtTime } from "@/lib/data";
import { useDB } from "@/lib/store";

/** L-04 Notifikasi */
export default function Notifikasi() {
  const db = useDB();
  const href = (n: (typeof notifications)[number]) => {
    if (n.eventId) return `/event/${n.eventId}`;
    const pin = db.pins.find((p) => p.id === n.pinId);
    return pin ? `/peta/tempat/${pin.id}` : "/peta";
  };
  return (
    <Screen header={<Header title="Notifikasi" />}>
      <ul className="divide-y divide-line">
        {notifications.map((n) => (
          <li key={n.id}>
            <Link href={href(n)} className="flex gap-3 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name={n.type === "event_start" ? "calendar" : "bell"} size={20} /></span>
              <span><span className="block text-sm font-medium">{n.text}</span><span className="text-xs text-ink-2">{fmtDate(n.time)} · {fmtTime(n.time)} WITA</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
