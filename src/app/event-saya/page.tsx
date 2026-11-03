"use client";
import { useState } from "react";
import { Header, Toggle2, Empty } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { EventCard } from "@/components/EventCard";
import { useDB } from "@/lib/store";
import { eventStatus } from "@/lib/data";

/** V-09 Event Saya — tab Terdaftar / Terlewati */
export default function EventSaya() {
  const db = useDB();
  const [tab, setTab] = useState<"a" | "b">("a");
  const mine = db.events.filter((e) => db.registered.includes(e.id));
  const list = mine.filter((e) => (eventStatus(e) === "selesai") === (tab === "b"));
  return (
    <Screen nav header={<Header title="Event Saya" back={false} />}>
      <Toggle2 value={tab} onChange={setTab} options={[{ v: "a", label: "Terdaftar" }, { v: "b", label: "Terlewati" }]} />
      <div className="mt-4 space-y-4 pb-4">
        {list.length ? list.map((e) => <EventCard key={e.id} e={e} />) : <Empty title={tab === "a" ? "Belum ada event terdaftar" : "Belum ada event terlewati"} sub="Daftar event dari Home." />}
      </div>
    </Screen>
  );
}
