"use client";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { PetaView } from "@/components/PetaView";
/** V-03q Peta dari QR — target URL di dalam QR Peta */
export default function Page() { const { id } = useParams<{ id: string }>(); return <Suspense><PetaView qrEventId={id} /></Suspense>; }
