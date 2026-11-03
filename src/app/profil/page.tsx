"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header, Modal, Button, Badge } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { Icon } from "@/components/Icon";
import { setSession, useSession, initials } from "@/lib/auth";
import { useDB } from "@/lib/store";

/** V-13 Profil (V-13p untuk panitia) · V-13f Konfirmasi Keluar (overlay) */
export default function Profil() {
  const s = useSession();
  const db = useDB();
  const r = useRouter();
  const [out, setOut] = useState(false);
  const name = db.profile?.name ?? s?.name ?? "…";
  const menu = [
    { href: "/profil/edit", icon: "edit", label: "Edit Profil", hide: s?.role === "tamu" },
    { href: "/notifikasi", icon: "bell", label: "Notifikasi" },
    s?.role === "panitia" ? { href: "/panitia", icon: "grid", label: "Kelola Event" } : { href: "/event-saya", icon: "star", label: "Event Saya" },
    { href: "/profil/faq", icon: "help", label: "Bantuan & FAQ" },
    { href: "/profil/pengaturan", icon: "gear", label: "Pengaturan" },
    { href: "/profil/tentang", icon: "info", label: "Tentang WAYO" },
  ].filter((m) => !("hide" in m && m.hide));
  return (
    <Screen nav header={<Header title="Profil" back={false} />}>
      <div className="flex flex-col items-center py-4 text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft text-2xl font-bold text-primary">{initials(name)}</span>
        <p className="mt-3 text-lg font-semibold">{name}</p>
        <p className="text-sm text-ink-2">{db.profile?.email ?? s?.email}</p>
        <div className="mt-2"><Badge>{s?.role === "panitia" ? "Panitia" : s?.role === "tamu" ? "Tamu" : "Pengunjung"}</Badge></div>
      </div>
      <ul className="divide-y divide-line rounded-xl border border-line">
        {menu.map((m) => (
          <li key={m.label}><Link href={m.href} className="flex h-14 items-center gap-3 px-4 text-sm"><Icon name={m.icon} size={20} className="text-primary" /><span className="flex-1">{m.label}</span><Icon name="chevron" size={18} className="text-ink-2" /></Link></li>
        ))}
        <li><button onClick={() => setOut(true)} className="flex h-14 w-full items-center gap-3 px-4 text-sm font-medium text-danger"><Icon name="logout" size={20} />{s?.role === "tamu" ? "Keluar dari mode tamu" : "Keluar"}</button></li>
      </ul>
      <Modal open={out} onClose={() => setOut(false)}>
        <h2 className="text-lg font-semibold">Keluar dari akun?</h2>
        <p className="mt-1 text-sm text-ink-2">Kamu perlu login lagi untuk memakai fitur seperti Scan QR.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setOut(false)}>Batal</Button>
          <Button variant="danger" onClick={() => { setSession(null); r.replace("/login"); }}>Keluar</Button>
        </div>
      </Modal>
    </Screen>
  );
}
