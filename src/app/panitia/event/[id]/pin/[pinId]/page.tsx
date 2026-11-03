"use client";
import { useParams } from "next/navigation";
import { Guard } from "@/components/Guard";
import { PinForm } from "@/components/PinForm";
import { Empty } from "@/components/ui";
import { useDB } from "@/lib/api";
/** P-05 / P-05b Edit Pin + P-08 Hapus */
export default function Page() {
  const { id, pinId } = useParams<{ id: string; pinId: string }>();
  const db = useDB();
  const p = db.pins.find((x) => x.id === pinId);
  return <Guard allow={["panitia"]}>{p ? <PinForm key={p.id} eventId={id} initial={p} /> : <Empty title="Pin tidak ditemukan" />}</Guard>;
}
