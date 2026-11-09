"use client";
import { useParams } from "next/navigation";
import { Guard } from "@/components/Guard";
import { Empty } from "@/components/ui";
import { EventForm } from "@/components/EventForm";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import { useEvent } from "@/lib/api";

/** A-03b Admin mengubah event mana pun (form panitia + jadwal kegiatan). */
function Edit() {
  const { id } = useParams<{ id: string }>();
  const { data: e, isLoading } = useEvent(id);
  if (!e) return isLoading ? <p className="p-6 text-sm text-ink-2">Memuat…</p> : <Empty title="Event tidak ditemukan" />;
  return (
    <EventForm key={e.id} initial={e} afterSave={() => "/admin/event"}>
      <ScheduleEditor eventId={e.id} items={e.schedule} eventStart={e.start} />
    </EventForm>
  );
}
export default function Page() { return <Guard allow={["admin"]} msg="Halaman khusus admin"><Edit /></Guard>; }
