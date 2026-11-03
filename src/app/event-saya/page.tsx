"use client";
import { useState } from "react";
import { Header, Toggle2, Empty } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { EventCard } from "@/components/EventCard";
import { useRegistrations } from "@/lib/api";

/** V-09 Event Saya — tab Terdaftar / Terlewati */
export default function EventSaya() {
  const [tab, setTab] = useState<"a" | "b">("a");
  const { data, isLoading } = useRegistrations(tab === "a" ? "terdaftar" : "terlewati");
  const list = data ?? [];
  return (
    <Screen nav header={<Header title="Event Saya" back={false} />}>
      <Toggle2 value={tab} onChange={setTab} options={[{ v: "a", label: "Terdaftar" }, { v: "b", label: "Terlewati" }]} />
      <div className="mt-4 space-y-4 pb-4">
        {isLoading ? <p className="text-sm text-ink-2">Memuat…</p> : list.length ? list.map((e) => <EventCard key={e.id} e={e} />) : <Empty title={tab === "a" ? "Belum ada event terdaftar" : "Belum ada event terlewati"} sub="Daftar event dari Home." />}
      </div>
    </Screen>
  );
}
