"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Guard } from "@/components/Guard";
import { Icon } from "@/components/Icon";
import { Button, BackButton } from "@/components/ui";
import { useDB } from "@/lib/store";
import { parseQr } from "@/lib/qr";

type CamState = "starting" | "on" | "nocam";

function Izin({ onAllow }: { onAllow: () => void }) {
  const r = useRouter();
  return (
<main className="flex flex-1 flex-col px-6 pb-8 pt-4">
        <BackButton className="!shadow-none -ml-2" />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name="camera" size={56} /></div>
          <h1 className="mt-6 text-xl font-semibold">Izinkan akses kamera</h1>
          <p className="mt-2 text-sm text-ink-2">Kamera dipakai untuk memindai QR Peta event. Gambar tidak disimpan.</p>
        </div>
        <div className="space-y-3">
          <Button onClick={onAllow}>Izinkan</Button>
          <Button variant="secondary" onClick={() => r.back()}>Nanti saja</Button>
        </div>
      </main>
  );
}

/** V-10a Izin Kamera → V-10 Scan QR · V-10s Senter menyala · V-10b QR tidak valid. Ada "Simulasi scan" + input manual untuk perangkat tanpa kamera. */
function Scanner() {
  const r = useRouter();
  const db = useDB();
  const [cam, setCam] = useState<CamState>("starting");
  const [torch, setTorch] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [manual, setManual] = useState("");
  const scRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const ids = db.events.map((e) => e.id);
  const handled = useRef(false);

  const handle = (text: string) => {
    if (handled.current) return;
    const id = parseQr(text, ids);
    if (id) { handled.current = true; scRef.current?.stop().catch(() => {}); r.push(`/peta/event/${id}`); }
    else setInvalid(true);
  };
  const handleRef = useRef(handle);
  handleRef.current = handle;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!alive) return;
        const sc = new Html5Qrcode("qr-reader", { verbose: false });
        scRef.current = sc;
        await sc.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (t) => handleRef.current(t), () => {});
        if (alive) setCam("on");
      } catch { if (alive) setCam("nocam"); }
    })();
    return () => { alive = false; const s = scRef.current; if (s?.isScanning) s.stop().catch(() => {}); };
  }, []);

  const toggleTorch = async () => {
    const next = !torch;
    setTorch(next);
    try { await scRef.current?.applyVideoConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] }); } catch { /* senter tidak didukung: tetap tampilkan state UI */ }
  };
  const sample = db.events.find((e) => e.id === "ev-sintaks") ?? db.events[0];

  return (
    <main className="relative flex flex-1 flex-col overflow-y-auto bg-gray-950 px-6 pb-6 pt-4 text-gray-50">
      <div className="flex items-center justify-between">
        <button onClick={() => r.back()} aria-label="Kembali" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"><Icon name="back" /></button>
        <h1 className="text-base font-semibold">Scan QR Peta</h1>
        <button onClick={toggleTorch} aria-label="Senter" aria-pressed={torch} className={`flex h-10 w-10 items-center justify-center rounded-full ${torch ? "bg-amber-300 text-ink" : "bg-white/10"}`}><Icon name="flash" /></button>
      </div>
      <div className={`relative mx-auto mt-6 aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl ${torch ? "bg-gray-600" : "bg-gray-800"}`}>
        <div id="qr-reader" className="h-full w-full [&_video]:h-full [&_video]:object-cover" />
        {cam !== "on" && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-gray-200">{cam === "starting" ? "Menyalakan kamera…" : "Kamera tidak tersedia / izin ditolak. Gunakan Simulasi scan atau masukkan kode di bawah."}</div>}
        <div className="pointer-events-none absolute inset-6 rounded-xl border-4 border-white/90" />
      </div>
      <p className="mt-4 text-center text-sm text-gray-200">Arahkan kamera ke QR Peta event{torch ? " · Senter menyala" : ""}</p>
      <div className="mt-6 space-y-3">
        <Button onClick={() => handle(`wayo:${sample.id}`)}>Simulasi scan ({sample.name.replace(" (contoh)", "")})</Button>
        <form onSubmit={(e) => { e.preventDefault(); handle(manual); }} className="flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Kode/URL QR, mis. ev-sintaks" aria-label="Kode QR manual"
            className="h-12 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-gray-300 outline-none" />
          <button className="h-12 rounded-lg bg-white px-4 text-sm font-semibold text-primary">Buka</button>
        </form>
        <button onClick={() => handle("qr-acak-tidak-valid")} className="w-full py-2 text-sm font-medium text-red-300 underline">Simulasi QR tidak valid</button>
      </div>
      {invalid && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/60" role="dialog" aria-modal>
          <div className="w-full rounded-t-2xl bg-white p-6 text-ink">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-danger"><Icon name="close" size={32} /></div>
            <h2 className="mt-3 text-center text-lg font-semibold">QR tidak valid</h2>
            <p className="mt-1 text-center text-sm text-ink-2">QR ini bukan QR Peta WAYO atau event-nya sudah dihapus.</p>
            <div className="mt-5 space-y-3"><Button onClick={() => setInvalid(false)}>Coba lagi</Button><Button variant="secondary" href="/peta">Buka Peta Kampus</Button></div>
          </div>
        </div>
      )}
    </main>
  );
}
export default function Page() {
  const [step, setStep] = useState<"izin" | "scan">("izin");
  return <Guard allow={["pengunjung", "panitia"]} msg="Scan QR memerlukan login">{step === "izin" ? <Izin onAllow={() => setStep("scan")} /> : <Scanner />}</Guard>;
}
