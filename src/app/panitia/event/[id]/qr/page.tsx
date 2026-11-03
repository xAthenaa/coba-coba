"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Guard } from "@/components/Guard";
import { Header, Button, Empty } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { useDB } from "@/lib/api";
import { qrPayload } from "@/lib/qr";
import { getPlace } from "@/lib/data";

/** P-06 QR Peta · P-06b toast "QR tersimpan"/"Tautan disalin" · P-06c Pratinjau Cetak */
function QrPage() {
  const { id } = useParams<{ id: string }>();
  const db = useDB();
  const toast = useToast();
  const e = db.events.find((x) => x.id === id);
  const [url, setUrl] = useState("");
  const [png, setPng] = useState("");
  const [print, setPrint] = useState(false);
  useEffect(() => {
    if (!e) return;
    const u = qrPayload(location.origin, e.id);
    setUrl(u);
    QRCode.toDataURL(u, { width: 720, margin: 2, color: { dark: "#1E3A8A", light: "#FFFFFF" }, errorCorrectionLevel: "M" }).then(setPng);
  }, [e]);
  if (!e) return <Screen header={<Header title="QR Peta" />}><Empty title="Event tidak ditemukan" /></Screen>;
  const download = () => { const a = document.createElement("a"); a.href = png; a.download = `qr-peta-${e.id}.png`; a.click(); toast("QR tersimpan"); };
  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: e.name, url }); else { await navigator.clipboard.writeText(url); toast("Tautan QR disalin"); } }
    catch { toast("Tautan QR disalin"); }
  };
  if (print) return (
    <>
      <div className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line px-6 print:hidden">
        <button onClick={() => setPrint(false)} aria-label="Kembali" className="text-primary"><Icon name="back" /></button>
        <h1 className="flex-1 text-xl font-semibold text-primary">Pratinjau Cetak</h1>
        <button onClick={() => window.print()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Cetak</button>
      </div>
      <main className="flex-1 overflow-y-auto bg-muted p-6 print:bg-white">
        <div className="mx-auto flex aspect-[1/1.414] w-full flex-col items-center justify-center rounded bg-white p-6 text-center shadow print:shadow-none">
          <p className="text-xs font-semibold tracking-widest text-primary">WAYO · SCAN UNTUK PETA</p>
          <h2 className="mt-2 text-xl font-bold">{e.name}</h2>
          <p className="text-xs text-ink-2">{getPlace(e.placeId)?.name}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {png && <img src={png} alt={`QR Peta ${e.name}`} className="mt-4 w-3/4" />}
          <p className="mt-3 text-xs text-ink-2">Buka kamera / aplikasi WAYO lalu arahkan ke QR</p>
        </div>
      </main>
    </>
  );
  return (
    <Screen header={<Header title="QR Peta" backHref={`/panitia/event/${e.id}`} />}>
      <div className="rounded-2xl border border-line p-6 text-center">
        <h2 className="text-base font-semibold">{e.name}</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {png ? <img src={png} alt={`QR Peta ${e.name}`} className="mx-auto mt-4 w-64" /> : <div className="mx-auto mt-4 h-64 w-64 animate-pulse rounded bg-muted" />}
        <p className="mt-3 break-all text-xs text-ink-2">{url}</p>
      </div>
      <div className="mt-5 space-y-3 pb-4">
        <Button onClick={download} disabled={!png}><Icon name="download" size={18} />Unduh PNG</Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={share}><Icon name="share" size={18} />Bagikan</Button>
          <Button variant="secondary" onClick={() => setPrint(true)}><Icon name="print" size={18} />Cetak</Button>
        </div>
      </div>
    </Screen>
  );
}
export default function Page() { return <Guard allow={["panitia"]}><QrPage /></Guard>; }
