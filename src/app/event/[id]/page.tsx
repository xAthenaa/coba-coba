"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BackButton, Button, Badge, Empty } from "@/components/ui";
import { Poster } from "@/components/Poster";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { registerEvent, useEvent, usePlaceIndex } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { campuses, eventStatus, fmtRange } from "@/lib/data";

/** V-02 Detail Event · V-02b (toast terdaftar) · V-02c Event Selesai (abu + label, Rute nonaktif) */
export default function DetailEvent() {
  const { id } = useParams<{ id: string }>();
  const { data: e, error, isLoading } = useEvent(id);
  const { place: getPlace } = usePlaceIndex();
  const r = useRouter();
  const toast = useToast();
  const s = useSession();
  if (isLoading) return <main className="flex flex-1 items-center justify-center text-sm text-ink-2">Memuat…</main>;
  if (!e) return <main className="flex-1 p-6"><BackButton /><Empty title="Event tidak ditemukan" sub={error && error.status !== 404 ? error.message : undefined} /></main>;
  const pl = e.place;
  const org = { id: e.organizerId, name: e.organizerName ?? "Penyelenggara" };
  const st = eventStatus(e);
  const done = st === "selesai";
  const reg = !!e.registered;
  const isPanitia = s?.role === "panitia";
  const daftar = async () => {
    try {
      await registerEvent(e.id);
      toast("Kamu terdaftar");
      setTimeout(() => r.push("/event-saya"), 1200);
    } catch (x) { toast(x instanceof Error ? x.message : "Gagal mendaftar", "error"); }
  };
  return (
    <main className={`relative flex-1 overflow-y-auto pb-6 ${done ? "grayscale-[.6]" : ""}`}>
      <div className="relative"><Poster e={e} className="h-60" /><BackButton className="absolute left-6 top-4" /></div>
      <div className="space-y-4 px-6 pt-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone={done ? "gray" : st === "berlangsung" ? "green" : "primary"}>{done ? "Selesai" : st === "berlangsung" ? "Berlangsung" : "Akan datang"}</Badge>
          <Badge>{e.faculty}</Badge>
        </div>
        <h1 className="text-2xl font-bold leading-tight text-ink">{e.name}</h1>
        <div className="grid grid-cols-1 gap-3 rounded-xl bg-soft p-4 text-sm">
          <p className="flex gap-2"><Icon name="calendar" size={18} className="text-primary" />{fmtRange(e.start, e.end)}</p>
          <p className="flex gap-2"><Icon name="pin" size={18} className="text-primary" />{pl?.name}, {pl && campuses[pl.campus].name}</p>
          <Link href={`/penyelenggara/${org.id}`} className="flex gap-2 font-medium text-primary"><Icon name="user" size={18} />{org.name} ›</Link>
          <Link href="/penyelenggara" className="pl-[26px] text-xs font-medium text-primary underline">Lihat semua penyelenggara</Link>
        </div>
        <section><h2 className="mb-1 text-base font-semibold">Deskripsi</h2><p className="text-sm text-ink-2">{e.description}</p></section>
        {e.speakers.length > 0 && <section><h2 className="mb-1 text-base font-semibold">Narasumber</h2><p className="text-sm text-ink-2">{e.speakers.join(", ")}</p></section>}
        {e.facilities.length > 0 && <section><h2 className="mb-2 text-base font-semibold">Fasilitas terdekat</h2>
          <div className="flex flex-wrap gap-2">{e.facilities.map((f) => { const p = getPlace(f); return p && <Link key={f} href={`/peta/tempat/${f}`} className="rounded-full border border-line px-3 py-1 text-xs">{p.name}</Link>; })}</div></section>}
        {done ? (
          <div className="space-y-3 pt-2">
            <p className="rounded-xl bg-muted p-3 text-center text-sm text-ink-2">Event ini sudah selesai. Pendaftaran & rute dinonaktifkan.</p>
            <Button variant="secondary" href={`/peta?fokus=${e.placeId}`}>Lihat di peta</Button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {isPanitia ? null : reg ? <Button disabled>✓ Sudah terdaftar</Button> : <Button onClick={daftar}>Daftar Sekarang</Button>}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" href={`/peta?fokus=${e.placeId}`}>Lihat di peta</Button>
              <Button variant="secondary" href={`/peta/rute/${e.placeId}?event=${e.id}`}>Rute ke lokasi</Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
