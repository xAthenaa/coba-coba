"use client";
import { useParams, useRouter } from "next/navigation";
import { MapView } from "@/components/MapView";
import { Button, Empty, Header, Banner } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useItem } from "@/lib/mapItems";
import { useGeo, SIM_START } from "@/lib/useGeo";
import { fmtDist, pathLength, walkMin } from "@/lib/geo";
import { useRoadRoute } from "@/lib/useRoadRoute";

/** V-06 Pratinjau Rute */
export default function Rute() {
  const { id } = useParams<{ id: string }>();
  const it = useItem(id);
  const geo = useGeo();
  const r = useRouter();
  const origin = geo.pos ?? SIM_START;
  const { route } = useRoadRoute(origin, it);
  if (!it) return <><Header title="Rute" /><main className="flex-1 p-6"><Empty title="Tujuan tidak ditemukan" /></main></>;
  const len = pathLength(route);
  const far = len > 3000;
  return (
    <>
      <div className="relative min-h-0 flex-1">
        <MapView center={it} markers={[{ id: it.id, lat: it.lat, lng: it.lng, cat: it.cat, label: it.name, selected: true }]} user={origin} route={route} />
        <button onClick={() => r.back()} className="absolute left-4 top-4 z-[500] flex h-10 items-center gap-1 rounded-full bg-white px-4 text-sm font-semibold text-primary shadow"><Icon name="close" size={18} />Batal</button>
      </div>
      <section className="z-10 shrink-0 rounded-t-2xl bg-white px-6 pb-6 pt-4 shadow-[0_-4px_16px_rgba(0,0,0,.08)]">
        {!geo.pos && <div className="mb-3"><Banner>Lokasi tidak aktif — asal rute memakai gerbang kampus (simulasi).</Banner></div>}
        {geo.state === "simulated" && <div className="mb-3"><Banner tone="info">Kamu di luar kampus — asal rute disimulasikan.</Banner></div>}
        {far && <div className="mb-3"><Banner>Tujuan berada di kampus lain ({fmtDist(len)}). Rute jalan kaki tidak disarankan.</Banner></div>}
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-600" />Lokasi saya</p>
          <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-danger" />{it.name}</p>
        </div>
        <div className="mt-4 flex items-end gap-2"><span className="text-2xl font-bold text-primary">{walkMin(len)} mnt</span><span className="pb-1 text-sm text-ink-2">· {fmtDist(len)} · jalan kaki</span></div>
        <div className="mt-4 grid grid-cols-[1fr_2fr] gap-3">
          <Button variant="secondary" onClick={() => r.push(`/peta/tempat/${it.id}`)}>Batal</Button>
          <Button onClick={() => r.push(`/peta/navigasi/${it.id}`)}>Mulai</Button>
        </div>
      </section>
    </>
  );
}
