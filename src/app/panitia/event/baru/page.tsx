"use client";
import { Guard } from "@/components/Guard";
import { EventForm } from "@/components/EventForm";
/** P-02 Tambah Event */
export default function Page() { return <Guard allow={["panitia"]}><EventForm /></Guard>; }
