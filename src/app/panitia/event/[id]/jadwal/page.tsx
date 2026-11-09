"use client";
import { useParams } from "next/navigation";
import { Guard } from "@/components/Guard";
import { Empty, Header } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { useEvent } from "@/lib/api";

/** P-09 Jadwal Kegiatan (rundown) — terpisah dari informasi event. */
function Jadwal() {
  const { id } = useParams<{ id: string }>();
  const { data: e, isLoading } = useEvent(id);
  return (
    <Screen header={<Header title="Jadwal Kegiatan" backHref={`/panitia/event/${id}`} />}>
      {e ? <><p className="mb-4 text-sm text-ink-2">{e.name}</p><ScheduleEditor eventId={e.id} items={e.schedule} eventStart={e.start} /></>
        : isLoading ? <p className="text-sm text-ink-2">Memuat…</p> : <Empty title="Event tidak ditemukan" />}
    </Screen>
  );
}
export default function Page() { return <Guard allow={["panitia"]}><Jadwal /></Guard>; }
