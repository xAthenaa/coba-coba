"use client";
import Link from "next/link";
import { useState } from "react";
import { Header, Toggle2 } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { useToast } from "@/components/Toast";
import { updateProfile } from "@/lib/api";
import { useSession } from "@/lib/auth";
import type { CampusId } from "@/lib/types";

/** V-13c Pengaturan */
export default function Pengaturan() {
  const toast = useToast();
  const [notif, setNotif] = useState(true);
  const s = useSession();
  const [picked, setPicked] = useState<CampusId | null>(null);
  const campus = picked ?? ((s?.defaultCampusId as CampusId) || "sudirman");
  const setCampus = async (c: CampusId) => { setPicked(c); try { await updateProfile({ defaultCampusId: c }); toast("Kampus default disimpan"); } catch { toast("Gagal menyimpan", "error"); } };
  return (
    <Screen header={<Header title="Pengaturan" />}>
      <section className="space-y-5">
        <label className="flex items-center justify-between"><span className="text-sm font-medium">Notifikasi event & pin</span>
          <input type="checkbox" checked={notif} onChange={(e) => setNotif(e.target.checked)} className="h-6 w-11 accent-primary" /></label>
        <div><p className="mb-2 text-xs font-semibold text-ink-2">BAHASA</p><p className="text-sm">Bahasa Indonesia</p></div>
        <div><p className="mb-2 text-xs font-semibold text-ink-2">KAMPUS DEFAULT</p>
          <Toggle2 value={campus} onChange={setCampus} options={[{ v: "jimbaran", label: "KAMPUS JIMBARAN" }, { v: "sudirman", label: "KAMPUS SUDIRMAN" }]} /></div>
        <Link href="/izin-lokasi" className="block text-sm font-semibold text-primary">Izin lokasi ›</Link>
        <Link href="/peta?lokasi=offline" className="block text-sm font-semibold text-primary">Simpan peta offline (lihat state offline) ›</Link>
      </section>
    </Screen>
  );
}
