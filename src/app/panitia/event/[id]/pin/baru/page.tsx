"use client";
import { useParams } from "next/navigation";
import { Guard } from "@/components/Guard";
import { PinForm } from "@/components/PinForm";
/** P-05 / P-05b Tambah Pin */
export default function Page() { const { id } = useParams<{ id: string }>(); return <Guard allow={["panitia"]}><PinForm eventId={id} /></Guard>; }
