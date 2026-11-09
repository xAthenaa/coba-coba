"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/MapView";
import { Button, Empty, Header, Modal } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useItem } from "@/lib/mapItems";
import { SIM_START, useGeo } from "@/lib/useGeo";
import { distance, fmtDist, pathLength, pathUntil, pointAlong, turnText, walkMin } from "@/lib/geo";
import { useRoadRoute } from "@/lib/useRoadRoute";

const SIM_SECONDS = 18; // durasi simulasi berjalan (dipercepat)

/** V-07 Navigasi Aktif (simulasi dimulai setelah rute dimuat) — jalan kaki disimulasikan di sepanjang rute; banner "Rute diperbarui" (re-route) di tengah. */
export default function Navigasi() {
  const { id } = useParams<{ id: string }>();
  const it = useItem(id);
  const geo = useGeo();
  const r = useRouter();
  const startRef = useRef(geo.pos ?? SIM_START);
  const { route, road } = useRoadRoute(startRef.current, it);
  const total = pathLength(route);
  const [walked, setWalked] = useState(0);
  const [reroute, setReroute] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!it || confirm || total <= 0) return;
    const step = total / (SIM_SECONDS * 4);
    const t = setInterval(() => setWalked((w) => Math.min(total, w + step)), 250);
    return () => clearInterval(t);
  }, [it, total, confirm]);
  useEffect(() => {
    if (!it) return;
    if (walked >= total && total > 0) { const t = setTimeout(() => r.replace(`/peta/tiba/${it.id}`), 600); return () => clearTimeout(t); }
    if (walked > total * 0.45 && walked < total * 0.45 + total / (SIM_SECONDS * 4) * 1.01) { setReroute(true); setTimeout(() => setReroute(false), 2500); }
  }, [walked, total, it, r]);
  if (!it) return <><Header title="Navigasi" /><main className="flex-1 p-6"><Empty title="Tujuan tidak ditemukan" /></main></>;
  // Rute jalan (OSRM) dimuat async: selama route masih [] pakai titik awal agar peta tidak crash (dulu: undefined.lat).
  const pos = pointAlong(route, walked) ?? startRef.current;
  const left = Math.max(0, total - walked);
  const firstLeg = !road && route.length > 2 ? distance(route[0], route[1]) : 0;
  const beforeTurn = walked < firstLeg;
  const instr = beforeTurn ? `${turnText(route)} dalam ${fmtDist(firstLeg - walked)}` : `Lurus ${fmtDist(left)} ke ${it.name}`;
  return (
    <>
      <div className="z-20 shrink-0 bg-primary px-6 pb-4 pt-5 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15"><Icon name={beforeTurn ? (turnText(route) === "Belok kiri" ? "arrowLeft" : "arrowRight") : "arrowUp"} size={34} /></span>
          <p className="flex-1 text-xl font-semibold leading-snug" aria-live="polite">{instr}</p>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {reroute && <div role="status" className="absolute inset-x-3 top-3 z-[600] rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-ink shadow">↻ Rute diperbarui</div>}
        <MapView center={pos} zoom={18} markers={[{ id: it.id, lat: it.lat, lng: it.lng, cat: it.cat, label: it.name, selected: true }]} user={pos}
          route={route} walked={pathUntil(route, walked)} focus={pos} focusKey={Math.floor(walked / 15)} />
        {geo.state !== "ok" && <p className="absolute bottom-2 left-3 z-[500] rounded bg-white/90 px-2 py-1 text-xs text-ink-2">Simulasi berjalan</p>}
      </div>
      <section className="z-10 flex shrink-0 items-center gap-4 border-t border-line bg-white px-6 pb-6 pt-4">
        <div className="flex-1">
          <p className="text-2xl font-bold text-primary">{walkMin(left)} mnt</p>
          <p className="text-sm text-ink-2">Sisa {fmtDist(left)} · tiba ±{new Date(Date.now() + walkMin(left) * 60000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <Button variant="danger" className="!w-32" onClick={() => setConfirm(true)}>Akhiri</Button>
      </section>
      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <h2 className="text-lg font-semibold">Akhiri navigasi?</h2>
        <p className="mt-1 text-sm text-ink-2">Kamu akan kembali ke peta.</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => setConfirm(false)}>Lanjut</Button><Button variant="danger" onClick={() => r.push("/peta")}>Akhiri</Button></div>
      </Modal>
    </>
  );
}
