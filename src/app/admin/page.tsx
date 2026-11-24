"use client";
import Link from "next/link";
import { Guard } from "@/components/Guard";
import { Header } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { Icon } from "@/components/Icon";
import { useAdminStats } from "@/lib/api";
import { useSession } from "@/lib/auth";

/** A-01 Dashboard Admin — ringkasan + menu manajemen. */
function Dashboard() {
  const { data: s } = useAdminStats();
  const me = useSession();
  const stat = (n: number | undefined, label: string) => (
    <div className="rounded-xl bg-soft p-3 text-center"><p className="text-lg font-bold text-primary">{n ?? "…"}</p><p className="text-xs text-ink-2">{label}</p></div>
  );
  const menu = [
    { href: "/admin/pengguna", icon: "user", label: "Kelola Pengguna", sub: `${s?.users ?? "…"} akun · ${s?.inactive ?? 0} nonaktif` },
    { href: "/admin/event", icon: "calendar", label: "Kelola Event", sub: `${s?.events ?? "…"} event` },
    { href: "/admin/tempat", icon: "pin", label: "Kelola Tempat", sub: `${s?.places ?? "…"} tempat (data master)` },
    { href: "/admin/fasilitas", icon: "info", label: "Kelola Fasilitas", sub: `${s?.facilities ?? "…"} fasilitas` },
    { href: "/admin/data", icon: "gear", label: "Pengawasan Data", sub: "Pendaftaran, pin, notifikasi" },
  ];
  return (
    <Screen nav header={<Header title="Dashboard Admin" back={false} />}>
      <p className="text-sm text-ink-2">Halo, <b className="text-ink">{me?.name ?? "Admin"}</b></p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {stat(s?.visitors, "Pengunjung")}{stat(s?.organizers, "Panitia")}{stat(s?.admins, "Admin")}
        {stat(s?.events, "Event")}{stat(s?.registrations, "Pendaftaran")}{stat(s?.pins, "Pin")}
      </div>
      <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
        {menu.map((m) => (
          <li key={m.href}><Link href={m.href} className="flex min-h-14 items-center gap-3 px-4 py-2 text-sm">
            <Icon name={m.icon} size={20} className="text-primary" />
            <span className="flex-1"><span className="block font-medium">{m.label}</span><span className="block text-xs text-ink-2">{m.sub}</span></span>
            <Icon name="chevron" size={18} className="text-ink-2" />
          </Link></li>
        ))}
      </ul>
    </Screen>
  );
}
export default function Page() { return <Guard allow={["admin"]} msg="Halaman khusus admin"><Dashboard /></Guard>; }
