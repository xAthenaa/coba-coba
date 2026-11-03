"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { LOC_PREF } from "@/lib/useGeo";

/** L-03 Izin Lokasi · L-03b Lokasi Ditolak / GPS Mati (?status=ditolak) */
function Izin() {
  const r = useRouter();
  const q = useSearchParams();
  const [denied, setDenied] = useState(q.get("status") === "ditolak");
  const allow = () => {
    if (!("geolocation" in navigator)) return setDenied(true);
    navigator.geolocation.getCurrentPosition(
      () => { localStorage.setItem(LOC_PREF, "allow"); r.push("/home"); },
      () => { localStorage.setItem(LOC_PREF, "later"); setDenied(true); },
      { timeout: 8000 },
    );
  };
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-black/50 px-6">
      <div className="w-full rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${denied ? "bg-red-50 text-danger" : "bg-primary-soft text-primary"}`}><Icon name="map" size={48} /></div>
        {denied ? <>
          <h1 className="mt-4 text-xl font-semibold">Lokasi tidak aktif</h1>
          <p className="mt-2 text-sm text-ink-2">Izin lokasi ditolak atau GPS mati. Aktifkan lokasi di pengaturan browser/perangkat agar titik biru & rute bisa tampil.</p>
          <div className="mt-6 space-y-3">
            <Button onClick={() => { setDenied(false); allow(); }}>Coba lagi</Button>
            <Button variant="secondary" href="/peta?lokasi=mati">Lihat Peta Tanpa Lokasi</Button>
            <Button variant="ghost" href="/home">Ke Beranda</Button>
          </div>
        </> : <>
          <h1 className="mt-4 text-xl font-semibold">Izinkan akses lokasi</h1>
          <p className="mt-2 text-sm text-ink-2">WAYO memakai lokasimu untuk menampilkan posisi di peta kampus dan rute jalan kaki ke tujuan.</p>
          <div className="mt-6 space-y-3">
            <Button onClick={allow}>Izinkan lokasi</Button>
            <Button variant="secondary" onClick={() => { localStorage.setItem(LOC_PREF, "later"); r.push("/home"); }}>Nanti saja</Button>
          </div>
        </>}
      </div>
    </main>
  );
}
export default function Page() { return <Suspense><Izin /></Suspense>; }
