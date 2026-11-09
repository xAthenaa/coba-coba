"use client";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icon";
import { useState } from "react";
import { Button, Field, Header } from "@/components/ui";
import { requestReset } from "@/lib/auth";

/** L-05b Cek Email · L-05c toast "Tautan dikirim ulang" */
function Sent({ email, onResend, onBack }: { email: string; onResend: () => void; onBack: () => void }) {
  return (
    <>
      <Header title="Cek Email" back={false} />
      <main className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-10 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name="check" size={44} /></div>
        <h2 className="mt-6 text-xl font-semibold">Tautan terkirim</h2>
        <p className="mt-2 text-sm text-ink-2">Jika <b className="text-ink">{email}</b> terdaftar, kami mengirim tautan atur ulang password ke email tersebut. Tautan berlaku 1 jam dan hanya bisa dipakai sekali.</p>
        <div className="mt-10 w-full space-y-3">
          <Button variant="secondary" onClick={onResend}>Kirim Ulang</Button>
          <Button href="/login">Kembali ke Login</Button>
          <Button variant="ghost" onClick={onBack}>Ganti email</Button>
        </div>
      </main>
    </>
  );
}

/** L-05 Lupa Password → L-05b/L-05c. POST /api/auth/forgot (respons sama untuk email terdaftar/tidak). */
export default function Lupa() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const send = async () => {
    setBusy(true); setErr("");
    try { await requestReset(email.trim()); return true; }
    catch (x) { setErr(x instanceof Error ? x.message : "Gagal mengirim tautan"); return false; }
    finally { setBusy(false); }
  };
  if (sent) return <Sent email={email} onResend={async () => { if (await send()) toast("Tautan dikirim ulang"); }} onBack={() => setSent(false)} />;
  return (
    <>
      <Header title="Lupa Password" backHref="/login" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <p className="mb-6 text-sm text-ink-2">Masukkan email akunmu. Kami akan mengirim tautan untuk mengatur ulang password.</p>
        <form onSubmit={async (e) => { e.preventDefault(); if (email && (await send())) setSent(true); }} className="space-y-6">
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Mengirim…" : "Kirim Tautan"}</Button>
        </form>
      </main>
    </>
  );
}
