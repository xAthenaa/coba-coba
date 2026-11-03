"use client";
import Link from "next/link";
import { useState } from "react";
import { Header, Empty } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { Icon } from "@/components/Icon";
import { useOrganizers } from "@/lib/api";
import { initials } from "@/lib/auth";

/** V-11 Katalog Penyelenggara */
export default function Katalog() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useOrganizers(q.trim());
  const list = data ?? [];
  return (
    <Screen nav header={<Header title="Penyelenggara" />}>
      <label className="flex h-12 items-center gap-2 rounded-lg border border-line px-3"><Icon name="search" size={18} className="text-ink-2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari penyelenggara" className="flex-1 text-sm outline-none" /></label>
      <ul className="mt-4 space-y-3">
        {list.map((o) => (
          <li key={o.id}><Link href={`/penyelenggara/${o.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">{initials(o.name)}</span>
            <span className="flex-1"><span className="block text-sm font-semibold">{o.name}</span><span className="text-xs text-ink-2">{o.eventCount ?? 0} event · {o.faculty}</span></span>
            <Icon name="chevron" size={18} className="text-ink-2" />
          </Link></li>
        ))}
      </ul>
      {!isLoading && !list.length && <Empty title="Tidak ditemukan" sub="Coba kata kunci lain." />}
    </Screen>
  );
}
