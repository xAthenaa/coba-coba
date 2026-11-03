"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ApiError, resolveQr } from "@/lib/api";

/** /q/[code] — tujuan URL QR Peta. Resolve via GET /api/qr/:code lalu ke /peta/event/:eventId. Belum login → /login?next=/q/[code] (middleware). */
export default function QrRedirect() {
  const { code } = useParams<{ code: string }>();
  const r = useRouter();
  const [bad, setBad] = useState(false);
  useEffect(() => {
    resolveQr(code)
      .then((t) => r.replace(`/peta/event/${t.eventId}`))
      .catch((x) => (x instanceof ApiError && x.status === 401 ? r.replace(`/login?next=${encodeURIComponent(`/q/${code}`)}`) : setBad(true)));
  }, [code, r]);
  if (!bad) return <main className="flex flex-1 items-center justify-center text-sm text-ink-2">Membuka peta…</main>;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-danger"><Icon name="close" size={32} /></div>
      <h1 className="mt-3 text-lg font-semibold">QR tidak valid</h1>
      <p className="mt-1 text-sm text-ink-2">QR ini sudah diganti panitia, atau event-nya sudah selesai/dihapus.</p>
      <div className="mt-6 w-full space-y-3"><Button href="/peta">Buka Peta Kampus</Button><Button variant="secondary" href="/home">Ke Beranda</Button></div>
    </main>
  );
}
