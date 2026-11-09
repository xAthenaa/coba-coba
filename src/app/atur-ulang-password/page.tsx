"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button, Empty, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { checkResetToken, resetPassword } from "@/lib/auth";

/** L-05d Atur Ulang Password dari tautan email (?token=). Setelah berhasil semua sesi dicabut → login ulang. */
function Reset() {
  const token = useSearchParams().get("token") ?? "";
  const [valid, setValid] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { if (!token) { setValid(false); return; } checkResetToken(token).then((r) => setValid(r.valid)).catch(() => setValid(false)); }, [token]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("Password minimal 8 karakter");
    if (pw !== pw2) return setErr("Konfirmasi password tidak sama");
    setBusy(true); setErr("");
    try { await resetPassword(token, pw); setDone(true); }
    catch (x) { setErr(x instanceof Error ? x.message : "Gagal mengubah password"); setBusy(false); }
  };
  if (done) return (
    <main className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-10 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon name="check" size={44} /></div>
      <h2 className="mt-6 text-xl font-semibold">Password diperbarui</h2>
      <p className="mt-2 text-sm text-ink-2">Silakan masuk dengan password baru. Semua sesi lama sudah dikeluarkan.</p>
      <div className="mt-10 w-full"><Button href="/login">Ke Login</Button></div>
    </main>
  );
  if (valid === null) return <main className="flex flex-1 items-center justify-center text-sm text-ink-2">Memeriksa tautan…</main>;
  if (!valid) return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <Empty title="Tautan tidak valid" sub="Tautan atur ulang tidak valid, sudah dipakai, atau kedaluwarsa (berlaku 1 jam)." />
      <Button href="/lupa-password">Minta tautan baru</Button>
    </main>
  );
  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <p className="mb-6 text-sm text-ink-2">Buat password baru untuk akun WAYO kamu.</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Password baru" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <Field label="Ulangi password baru" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Simpan Password"}</Button>
      </form>
    </main>
  );
}
export default function Page() { return <><Header title="Atur Ulang Password" backHref="/login" /><Suspense><Reset /></Suspense></>; }
