"use client";
import { useParams } from "next/navigation";
import { Guard } from "@/components/Guard";
import { EventForm } from "@/components/EventForm";
import { Empty } from "@/components/ui";
import { useEvent } from "@/lib/api";
/** P-02 Edit Event */
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const { data: e, isLoading } = useEvent(id);
  return <Guard allow={["panitia"]}>{e ? <EventForm key={e.id} initial={e} /> : isLoading ? <p className="p-6 text-sm text-ink-2">Memuat…</p> : <Empty title="Event tidak ditemukan" />}</Guard>;
}
