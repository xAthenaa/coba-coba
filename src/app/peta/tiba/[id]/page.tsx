"use client";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useItem } from "@/lib/mapItems";
import { useEvents } from "@/lib/api";

/** V-08 Sampai Tujuan */
export default function Sampai() {
  const { id } = useParams<{ id: string }>();
  const it = useItem(id);
  const { data: events = [] } = useEvents();
  const ev = events.find((e) => e.placeId === id || e.id === it?.pin?.eventId);
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-green-100 text-success"><Icon name="check" size={60} strokeWidth={3} /></div>
      <h1 className="mt-6 text-2xl font-bold">Kamu sudah sampai!</h1>
      <p className="mt-2 text-base text-ink-2">{it?.name ?? "Tujuan"}</p>
      <div className="mt-10 w-full space-y-3">
        {ev && <Button href={`/event/${ev.id}`}>Lihat detail event</Button>}
        <Button variant={ev ? "secondary" : "primary"} href="/peta">Kembali ke peta</Button>
      </div>
    </main>
  );
}
