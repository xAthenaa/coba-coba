"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Field, Banner } from "@/components/ui";
import { login } from "@/lib/auth";
import { LOC_PREF } from "@/lib/useGeo";

/** L-01 Login: peran ditentukan dari akun (tanpa toggle; pilihan peran hanya di Daftar). Login ke POST /api/auth/login; cookie sesi httpOnly diset server. Tanpa mode tamu. */
function Login() {
  const r = useRouter();
  const q = useSearchParams();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const next = q.get("next");
  const afterLogin = (rl: "pengunjung" | "panitia") =>
    r.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : rl === "panitia" ? "/panitia" : localStorage.getItem(LOC_PREF) ? "/home" : "/izin-lokasi");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pw) return setErr("Email dan password wajib diisi");
    setBusy(true); setErr("");
    try {
      const u = await login(email.trim(), pw);
      afterLogin(u.role);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Gagal masuk");
      setBusy(false);
    }
  };
  return (
    <main className="flex-1 overflow-y-auto px-6 pb-8 pt-10">
      <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-sky-200">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="#1E3A8A"><path d="M2 11 22 3l-7 19-3-8z" /></svg>
      </div>
      <h1 className="mt-4 text-center text-xl font-semibold text-primary">Login</h1>
      <p className="text-center text-xs text-ink-2">Tolong masukan email dan password</p>
      {next && <div className="mt-4"><Banner>Silakan masuk untuk melanjutkan.</Banner></div>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@contoh.id" autoComplete="email" />
        <div>
          <Field label="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••" autoComplete="current-password" />
          <Link href="/lupa-password" className="mt-2 inline-block text-xs text-primary">Lupa Password?</Link>
        </div>
        {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Memproses…" : "Login"}</Button>
      </form>
      <p className="mt-3 text-center text-xs text-ink-2">Demo (contoh): panitia@contoh.id atau pengunjung@contoh.id / demo123</p>
      <p className="mt-6 text-center text-xs text-ink">Belum memiliki akun? <Link href="/daftar" className="font-semibold text-primary">Daftar sekarang</Link></p>
    </main>
  );
}
export default function Page() { return <Suspense><Login /></Suspense>; }
