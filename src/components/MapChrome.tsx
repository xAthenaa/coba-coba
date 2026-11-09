"use client";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { Compass } from "./MapView";
import { Toggle2 } from "./ui";
import { useSession } from "@/lib/auth";
import { useToast } from "./Toast";
import { tokens, categoryLabel } from "@/lib/tokens";
import type { CampusId } from "@/lib/types";

export function CampusToggle({ value, onChange }: { value: CampusId; onChange: (c: CampusId) => void }) {
  return <Toggle2 value={value} onChange={onChange} options={[{ v: "jimbaran", label: "KAMPUS JIMBARAN" }, { v: "sudirman", label: "KAMPUS SUDIRMAN" }]} />;
}

export function MapButtons({ onLocate, locActive, showScan = true }: { onLocate: () => void; locActive?: boolean; showScan?: boolean }) {
  const r = useRouter();
  const s = useSession();
  const toast = useToast();
  return (
    <>
      <div className="absolute right-3 top-3 z-[500]"><Compass /></div>
      <div className="absolute bottom-3 right-3 z-[500] flex flex-col gap-3">
        {showScan && <button aria-label="Scan QR Peta" onClick={() => { if (s?.role === "panitia" || s?.role === "admin") toast("Scan QR khusus pengunjung", "error"); else r.push("/scan"); }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg"><Icon name="qr" /></button>}
        <button aria-label="Lokasi saya" aria-pressed={locActive} onClick={onLocate}
          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary shadow-lg ${locActive ? "bg-primary text-white" : "bg-white text-primary"}`}><Icon name="locate" /></button>
      </div>
    </>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 px-6 py-2 text-xs text-ink">
      {["gedung", "toilet", "kantin", "event", "parkir", "info", "stand"].map((c) => (
        <span key={c} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: tokens.category[c] }} />{categoryLabel[c]}</span>
      ))}
    </div>
  );
}
