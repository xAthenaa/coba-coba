"use client";
/* V-03 family — dipakai oleh /peta dan /peta/event/[id] */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MapView } from "./MapView";
import { CampusToggle, MapButtons, Legend } from "@/components/MapChrome";
import { BottomNav } from "@/components/BottomNav";
import { Chip, Banner, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { campuses, DEFAULT_CAMPUS, getPlace } from "@/lib/data";
import { useMapItems } from "@/lib/mapItems";
import { useGeo } from "@/lib/useGeo";
import { useDB } from "@/lib/store";
import { tokens, categoryLabel } from "@/lib/tokens";
import { distance, fmtDist, walkMin } from "@/lib/geo";
import type { CampusId } from "@/lib/types";

const CATS = ["gedung", "event", "kantin", "toilet", "parkir", "info", "stand"];

/** V-03 Peta · V-03t/g/e/k/p/i/s (?kategori=) · V-03L (lokasi saya aktif) · V-03c (offline/lokasi mati) · V-03q Peta dari QR (/peta/event/[id]) */
export function PetaView({ qrEventId }: { qrEventId?: string }) {
  const q = useSearchParams();
  const r = useRouter();
  const toast = useToast();
  const db = useDB();
  const items = useMapItems();
  const geo = useGeo();
  const qrEvent = db.events.find((e) => e.id === qrEventId);
  const focusId = q.get("fokus") ?? q.get("pin") ?? (qrEvent?.placeId || null);
  const focusItem = items.find((i) => i.id === focusId) ?? (focusId ? (() => { const p = getPlace(focusId); return p && { id: p.id, name: p.name, cat: p.category, lat: p.lat, lng: p.lng, campus: p.campus }; })() : undefined);
  const [campus, setCampus] = useState<CampusId>(focusItem?.campus ?? DEFAULT_CAMPUS);
  const cat = q.get("kategori") ?? "";
  const [locOn, setLocOn] = useState(false);
  const [fk, setFk] = useState(0);
  const shown = useMemo(() => items.filter((i) => i.campus === campus && (!cat || i.cat === cat)), [items, campus, cat]);
  const setCat = (c: string) => { const p = new URLSearchParams(q.toString()); if (c) p.set("kategori", c); else p.delete("kategori"); r.replace(`${location.pathname}?${p}`); };
  const locBad = geo.state === "denied" || geo.state === "off";
  const locate = () => {
    if (locBad || geo.state === "offline") { toast("Lokasi tidak tersedia — aktifkan GPS", "error"); return; }
    if (!geo.pos) { toast("Mencari lokasi…"); return; }
    setLocOn((v) => !v); setFk((k) => k + 1);
  };
  const focus = locOn && geo.pos ? geo.pos : focusItem ? focusItem : campuses[campus].center;
  return (
    <>
      <div className="z-20 shrink-0 space-y-3 bg-white px-6 pb-3 pt-4">
        <CampusToggle value={campus} onChange={(c) => { setCampus(c); setLocOn(false); setFk((k) => k + 1); }} />
        <Link href="/peta/cari" className="flex h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm text-ink-2"><Icon name="search" size={18} />Cari lokasi</Link>
        <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6" role="toolbar" aria-label="Filter kategori">
          <Chip active={!cat} onClick={() => setCat("")}>Semua</Chip>
          {CATS.map((c) => <Chip key={c} active={cat === c} color={tokens.category[c]} onClick={() => setCat(cat === c ? "" : c)}>{categoryLabel[c]}</Chip>)}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-x-3 top-3 z-[600] space-y-2 pr-16">
          {qrEvent && <Banner tone="info" action={<Link href={`/event/${qrEvent.id}`} className="font-semibold underline">Lihat event</Link>}>Peta dari QR: {qrEvent.name}</Banner>}
          {geo.state === "offline" && <Banner>Offline — menampilkan peta tersimpan (contoh).</Banner>}
          {locBad && <Banner action={<Link href="/izin-lokasi?status=ditolak" className="font-semibold underline">Aktifkan</Link>}>Lokasi {geo.state === "off" ? "GPS mati" : "ditolak"}.</Banner>}
          {geo.state === "simulated" && locOn && <Banner tone="info">Kamu di luar kampus — memakai posisi simulasi.</Banner>}
          {cat && shown.length > 0 && cat !== "event" && geo.pos && (() => { const n = [...shown].sort((a, b) => distance(geo.pos!, a) - distance(geo.pos!, b))[0];
            return <Link href={`/peta/tempat/${n.id}`} className="block rounded-xl bg-ink px-3 py-2 text-xs font-medium text-white">{categoryLabel[cat]} terdekat: {n.name} · {fmtDist(distance(geo.pos!, n))} ›</Link>; })()}
        </div>
        <MapView center={campuses[campus].center} markers={shown.map((i) => ({ id: i.id, lat: i.lat, lng: i.lng, cat: i.cat, label: i.name, selected: i.id === focusId }))}
          user={geo.pos} onMarker={(id) => r.push(`/peta/tempat/${id}`)} focus={focus} focusKey={`${fk}-${campus}-${focusId}`} />
        <MapButtons onLocate={locate} locActive={locOn} />
        {focusItem && (q.get("fokus") || q.get("pin")) && (
          <div className="absolute inset-x-3 bottom-3 z-[600] mr-16 rounded-xl bg-white p-3 shadow-lg">
            <p className="text-sm font-semibold">{focusItem.name}</p>
            <p className="text-xs text-ink-2">{categoryLabel[focusItem.cat]}{geo.pos ? ` · ${fmtDist(distance(geo.pos, focusItem))} · ${walkMin(distance(geo.pos, focusItem))} mnt` : ""}</p>
            <Button className="mt-2 !h-10" href={`/peta/tempat/${focusItem.id}`}>Lihat detail</Button>
          </div>
        )}
      </div>
      <Legend />
      <BottomNav />
    </>
  );
}
