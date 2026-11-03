"use client";
import Link from "next/link";
import { useState } from "react";
import { BackButton, Chip, CatDot, Empty } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useMapItems } from "@/lib/mapItems";
import { useGeo, SIM_START } from "@/lib/useGeo";
import { campuses } from "@/lib/data";
import { categoryLabel } from "@/lib/tokens";
import { distance, fmtDist, walkMin } from "@/lib/geo";

/** V-04 Cari Tempat · V-04b hasil kosong */
export default function Cari() {
  const items = useMapItems();
  const geo = useGeo();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const origin = geo.pos ?? SIM_START;
  const res = items
    .filter((i) => (!cat || i.cat === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())))
    .map((i) => ({ ...i, d: distance(origin, i) }))
    .sort((a, b) => a.d - b.d);
  return (
    <>
      <header className="z-20 flex shrink-0 items-center gap-2 border-b border-line px-6 py-3">
        <BackButton className="!shadow-none -ml-2" />
        <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-line px-3"><Icon name="search" size={18} className="text-ink-2" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari tempat, gedung, event" aria-label="Cari tempat" className="flex-1 text-sm outline-none" /></label>
      </header>
      <main className="flex-1 overflow-y-auto px-6 py-4">
        <p className="mb-2 text-xs font-semibold text-ink-2">TERDEKAT</p>
        <div className="flex gap-2">{["toilet", "kantin", "parkir"].map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? "" : c)}>{categoryLabel[c]} terdekat</Chip>)}</div>
        {!geo.pos && <p className="mt-2 text-xs text-ink-2">Jarak dihitung dari gerbang kampus (lokasi tidak aktif).</p>}
        {res.length ? (
          <ul className="mt-4 divide-y divide-line">
            {res.map((i) => (
              <li key={i.id}><Link href={`/peta/tempat/${i.id}`} className="flex items-center gap-3 py-3">
                <CatDot cat={i.cat} />
                <span className="flex-1"><span className="block text-sm font-medium">{i.name}</span><span className="text-xs text-ink-2">{categoryLabel[i.cat]} · {campuses[i.campus].name}</span></span>
                <span className="text-right text-xs text-ink-2">{fmtDist(i.d)}<br />{walkMin(i.d)} mnt</span>
              </Link></li>
            ))}
          </ul>
        ) : <Empty title="Tempat tidak ditemukan" sub={`Tidak ada hasil untuk “${q}”. Coba kata kunci lain.`} />}
      </main>
    </>
  );
}
