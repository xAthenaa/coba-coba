"use client";
import { useParams } from "next/navigation";
import { Header, Empty } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { EventCard } from "@/components/EventCard";
import { getOrganizer } from "@/lib/data";
import { useDB } from "@/lib/store";
import { initials } from "@/lib/auth";

/** V-12 Detail Penyelenggara */
export default function DetailOrg() {
  const { id } = useParams<{ id: string }>();
  const db = useDB();
  const o = getOrganizer(id);
  if (!o) return <Screen header={<Header title="Penyelenggara" />}><Empty title="Penyelenggara tidak ditemukan" /></Screen>;
  const evs = db.events.filter((e) => e.organizerId === o.id);
  return (
    <Screen header={<Header title="Penyelenggara" />}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary">{initials(o.name)}</span>
        <h2 className="mt-3 text-xl font-semibold">{o.name}</h2>
        <p className="text-xs text-ink-2">{o.faculty}</p>
        <p className="mt-3 text-sm text-ink-2">{o.description}</p>
        <a href={`mailto:${o.contact}`} className="mt-2 text-sm font-medium text-primary">{o.contact}</a>
      </div>
      <h3 className="mb-3 mt-6 text-base font-semibold">Event ({evs.length})</h3>
      <div className="space-y-4 pb-4">{evs.map((e) => <EventCard key={e.id} e={e} />)}</div>
    </Screen>
  );
}
