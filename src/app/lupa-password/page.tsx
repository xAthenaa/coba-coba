"use client";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icon";
import { useState } from "react";
import { Button, Field, Header } from "@/components/ui";

/** L-05b Cek Email · L-05c toast "Tautan dikirim ulang" */
function Sent({ email, toast, onBack }: { email: string; toast: (m: string) => void; onBack: () => void }) {
  return (
    <>
      <Header title="Cek Email" back={false} />
      <main className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-10 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name="check" size={44} /></div>
        <h2 className="mt-6 text-xl font-semibold">Tautan terkirim</h2>
        <p className="mt-2 text-sm text-ink-2">Kami mengirim tautan atur ulang password ke <b className="text-ink">{email}</b> (simulasi, tidak ada email sungguhan).</p>
        <div className="mt-10 w-full space-y-3">
          <Button variant="secondary" onClick={() => toast("Tautan dikirim ulang")}>Kirim Ulang</Button>
          <Button href="/login">Kembali ke Login</Button>
          <Button variant="ghost" onClick={onBack}>Ganti email</Button>
        </div>
      </main>
    </>
  );
}

/** L-05 Lupa Password → L-05b/L-05c */
export default function Lupa() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const toast = useToast();
  if (sent) return <Sent email={email} toast={toast} onBack={() => setSent(false)} />;
  return (
    <>
      <Header title="Lupa Password" backHref="/login" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <p className="mb-6 text-sm text-ink-2">Masukkan email akunmu. Kami akan mengirim tautan untuk mengatur ulang password (simulasi).</p>
        <form onSubmit={(e) => { e.preventDefault(); if (email) setSent(true); }} className="space-y-6">
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit">Kirim Tautan</Button>
        </form>
      </main>
    </>
  );
}
