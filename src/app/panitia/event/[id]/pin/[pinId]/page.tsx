"use client";
import { useParams } from "next/navigation";
import { Guard } from "@/components/Guard";
import { PinForm } from "@/components/PinForm";
import { Empty } from "@/components/ui";
import { useEventPins } from "@/lib/api";
/** P-05 / P-05b Edit Pin + P-08 Hapus */
export default function Page() {
  const { id, pinId } = useParams<{ id: string; pinId: string }>();
  const { data, isLoading } = useEventPins(id);
  const p = data?.find((x) => x.id === pinId);
  return <Guard allow={["panitia"]}>{p ? <PinForm key={p.id} eventId={id} initial={p} /> : isLoading ? <p className="p-6 text-sm text-ink-2">Memuat…</p> : <Empty title="Pin tidak ditemukan" />}</Guard>;
}
