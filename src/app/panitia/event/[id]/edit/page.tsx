"use client";
import { useParams } from "next/navigation";
import { Guard } from "@/components/Guard";
import { EventForm } from "@/components/EventForm";
import { Empty } from "@/components/ui";
import { useDB } from "@/lib/api";
/** P-02 Edit Event */
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const db = useDB();
  const e = db.events.find((x) => x.id === id);
  return <Guard allow={["panitia"]}>{e ? <EventForm key={e.id} initial={e} /> : <Empty title="Event tidak ditemukan" />}</Guard>;
}
