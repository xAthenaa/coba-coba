"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MapView } from "@/components/MapView";
import { BottomNav } from "@/components/BottomNav";
import { Button, Badge, Empty, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useItem } from "@/lib/mapItems";
import { useGeo, SIM_START } from "@/lib/useGeo";
import { useDB } from "@/lib/store";
import { campuses, eventStatus, fmtDate, fmtTime, getPlace } from "@/lib/data";
import { categoryLabel } from "@/lib/tokens";
import { distance, fmtDist, walkMin } from "@/lib/geo";

/** V-05 Detail Tempat (bottom sheet di atas peta) · V-05b Detail Pin Berbasis Waktu */
export default function Tempat() {
  const { id } = useParams<{ id: string }>();
  const it = useItem(id);
  const geo = useGeo();
  const db = useDB();
  const r = useRouter();
  if (!it) return <><Header title="Detail Tempat" /><main className="flex-1 p-6"><Empty title="Tempat tidak ditemukan" /></main></>;
  const origin = geo.pos ?? SIM_START;
  const d = distance(origin, it);
  const placeId = it.pin ? null : it.id;
  const evHere = db.events.filter((e) => (placeId ? e.placeId === placeId : e.id === it.pin?.eventId) && eventStatus(e) !== "selesai");
  const parent = it.pin ? db.events.find((e) => e.id === it.pin!.eventId) : undefined;
  return (
    <>
      <div className="relative h-[38%] shrink-0">
        <MapView center={it} zoom={18} markers={[{ id: it.id, lat: it.lat, lng: it.lng, cat: it.cat, label: it.name, selected: true }]} user={geo.pos} />
        <button aria-label="Tutup" onClick={() => r.push(`/peta`)} className="absolute left-4 top-4 z-[500] flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary shadow"><Icon name="close" /></button>
      </div>
      <main className="relative z-10 -mt-4 min-h-0 flex-1 overflow-y-auto rounded-t-2xl bg-white px-6 pb-6 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,.08)]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <h1 className="text-xl font-semibold text-primary">{it.name}</h1>
        <p className="text-xs text-ink-2">{categoryLabel[it.cat]} · {campuses[it.campus].name}, Universitas Udayana</p>
        {it.pin && <div className="mt-2 flex gap-2"><Badge tone={it.pin.type === "timed" ? "amber" : "primary"}>{it.pin.type === "timed" ? "Berbasis waktu" : "Permanen"}</Badge></div>}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-base font-semibold">{fmtDist(d)}</p><p className="text-xs text-ink-2">Jarak</p></div>
          <div><p className="text-base font-semibold">{walkMin(d)} mnt</p><p className="text-xs text-ink-2">Jalan kaki</p></div>
          <div><p className="text-base font-semibold">{it.pin ? "Aktif" : "Buka"}</p><p className="text-xs text-ink-2">{it.hours ?? (it.pin?.end ? `s.d. ${fmtTime(it.pin.end)}` : "07.00 – 21.00")}</p></div>
        </div>
        {!geo.pos && <p className="mt-2 text-xs text-ink-2">Jarak dari gerbang kampus (lokasi tidak aktif).</p>}
        <div className="mt-4 flex h-28 items-center justify-center rounded-xl bg-muted text-xs text-ink-2">Foto tempat (contoh)</div>
        {it.description && <p className="mt-3 text-sm text-ink-2">{it.description}</p>}
        {it.pin?.type === "timed" && it.pin.start && it.pin.end && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
            <p className="font-semibold text-amber-900">Masa tampil pin</p>
            <p className="text-amber-900">{fmtDate(it.pin.start)} {fmtTime(it.pin.start)} – {fmtDate(it.pin.end)} {fmtTime(it.pin.end)} WITA. Pin hilang otomatis setelahnya.</p>
          </div>
        )}
        <Button className="mt-4" href={`/peta/rute/${it.id}`}>Rute ke Sini</Button>
        {!it.pin && <><h2 className="mt-5 text-sm font-semibold text-primary">Jam operasional</h2>
          <p className="mt-1 flex justify-between text-sm"><span>Senin – Jumat</span><span className="text-ink-2">{it.hours ?? "07.00 – 21.00"}</span></p>
          <p className="flex justify-between text-sm"><span>Sabtu – Minggu</span><span className="text-ink-2">08.00 – 17.00</span></p></>}
        <h2 className="mt-5 text-sm font-semibold text-primary">Event aktif di sini</h2>
        {evHere.length ? evHere.map((e) => (
          <Link key={e.id} href={`/event/${e.id}`} className="mt-2 flex items-center justify-between rounded-xl border border-line p-3 text-sm">
            <span><span className="block font-medium">{e.name}</span><span className="text-xs text-ink-2">{fmtDate(e.start)}</span></span><Icon name="chevron" size={18} />
          </Link>
        )) : <p className="mt-1 text-sm text-ink-2">{parent ? `Bagian dari ${parent.name}` : "Tidak ada event aktif."}</p>}
        {placeId && getPlace(placeId) === undefined && null}
      </main>
      <BottomNav />
    </>
  );
}
