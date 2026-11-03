"use client";
import Link from "next/link";
import { Header } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { Icon } from "@/components/Icon";
import { fmtDate, fmtTime } from "@/lib/data";
import { readAllNotifs, readNotif, useNotifications } from "@/lib/api";
import type { Notif } from "@/lib/types";

/** L-04 Notifikasi — GET /api/notifications (unreadCount), tandai dibaca per item / semua */
export default function Notifikasi() {
  const { data, isLoading } = useNotifications();
  const href = (n: Notif) => (n.pinId ? `/peta/tempat/${n.pinId}` : n.eventId ? `/event/${n.eventId}` : "/peta");
  return (
    <Screen header={<Header title="Notifikasi" />}>
      <div className="flex items-center justify-between pb-2 text-xs text-ink-2">
        <span>{data ? `${data.unreadCount} belum dibaca` : ""}</span>
        {!!data?.unreadCount && <button onClick={() => readAllNotifs()} className="font-semibold text-primary">Tandai semua dibaca</button>}
      </div>
      {isLoading && <p className="text-sm text-ink-2">Memuat…</p>}
      {data && !data.items.length && <p className="py-8 text-center text-sm text-ink-2">Belum ada notifikasi.</p>}
      <ul className="divide-y divide-line">
        {data?.items.map((n) => (
          <li key={n.id}>
            <Link href={href(n)} onClick={() => { if (!n.read) void readNotif(n.id); }} className={`flex gap-3 py-4 ${n.read ? "opacity-70" : ""}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name={n.type === "event_start" ? "calendar" : n.type.startsWith("pin") ? "pin" : "bell"} size={20} /></span>
              <span className="flex-1"><span className={`block text-sm ${n.read ? "" : "font-semibold"}`}>{n.text}</span><span className="text-xs text-ink-2">{fmtDate(n.time)} · {fmtTime(n.time)} WITA</span></span>
              {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-danger" aria-label="belum dibaca" />}
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
