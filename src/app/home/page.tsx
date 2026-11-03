"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Chip, Banner, Empty } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { Icon } from "@/components/Icon";
import { EventCard } from "@/components/EventCard";
import { useSession, initials } from "@/lib/auth";
import { useEvents, useNotifications, useOrganizers } from "@/lib/api";
import { eventStatus } from "@/lib/data";
import { useGeo } from "@/lib/useGeo";

const chips = [{ v: "", l: "Semua" }, { v: "FMIPA", l: "FMIPA" }, { v: "Teknik", l: "FT" }, { v: "FKH", l: "FKH" }, { v: "FK", l: "FK" }];

/** V-01 Home · V-01b (banner lokasi mati) · V-01f (?fakultas=) */
function Home() {
  const s = useSession();
  const { data: events, isLoading } = useEvents();
  const { data: organizers } = useOrganizers();
  const { data: notif } = useNotifications();
  const q = useSearchParams();
  const r = useRouter();
  const geo = useGeo();
  const fak = q.get("fakultas") ?? "";
  const order = { berlangsung: 0, "akan datang": 1, selesai: 2 };
  const list = (events ?? []).filter((e) => !fak || e.faculty === fak).sort((a, b) => order[eventStatus(a)] - order[eventStatus(b)]);
  const org = fak ? organizers?.find((o) => o.faculty === fak) : undefined;
  const scan = () => r.push("/scan");
  return (
    <>
      <header className="z-20 shrink-0 rounded-b-2xl bg-soft px-6 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <Link href="/profil" className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">{s ? initials(s.name) : "?"}</Link>
          <div className="flex-1"><p className="text-xs text-ink-2">Selamat Datang</p><p className="text-sm font-semibold">{s?.name ?? "…"}</p></div>
          <Link href="/notifikasi" aria-label="Notifikasi" className="relative flex h-12 w-12 items-center justify-center text-primary"><Icon name="bell" />{!!notif?.unreadCount && <span data-testid="unread" className="absolute right-3 top-3 h-2 w-2 rounded-full bg-danger" />}</Link>
        </div>
        <div className="mt-4 flex gap-2">
          <Link href="/peta/cari" className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-ink-2"><Icon name="search" size={18} />Cari event atau tempat</Link>
          <button onClick={scan} aria-label="Scan QR Peta" className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white"><Icon name="qr" size={20} /></button>
        </div>
      </header>
      <Screen nav>
        {(geo.state === "denied" || geo.state === "off") && (
          <div className="mb-3"><Banner action={<Link className="font-semibold underline" href="/izin-lokasi?status=ditolak">Aktifkan</Link>}>Lokasi mati — posisi & rute tidak akurat.</Banner></div>
        )}
        {geo.state === "offline" && <div className="mb-3"><Banner>Kamu sedang offline. Data mungkin tidak terbaru.</Banner></div>}
        <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-3">
          {chips.map((c) => <Chip key={c.l} active={fak === c.v} href={c.v ? `/home?fakultas=${c.v}` : "/home"}>{c.l}</Chip>)}
          <Chip href="/penyelenggara">Lainnya ›</Chip>
        </div>
        {org && (
          <div className="mb-3 flex items-center justify-between text-sm">
            <span>Penyelenggara: <b>{org.name}</b></span>
            <Link href={`/penyelenggara/${org.id}`} className="text-xs font-semibold text-primary">Lihat profil ›</Link>
          </div>
        )}
        <h2 className="mb-3 text-base font-semibold">Event</h2>
        <div className="space-y-4 pb-4">
          {isLoading ? <p className="text-sm text-ink-2">Memuat…</p> : list.length ? list.map((e) => <EventCard key={e.id} e={e} />) : <Empty title="Belum ada event" sub="Coba pilih fakultas lain." />}
        </div>
      </Screen>
    </>
  );
}
export default function Page() { return <Suspense><Home /></Suspense>; }
