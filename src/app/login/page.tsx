"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Field, Toggle2, Banner } from "@/components/ui";
import { setSession } from "@/lib/auth";
import { users } from "@/lib/data";
import { LOC_PREF } from "@/lib/useGeo";

/** L-01 Login (L-01-panitia = toggle Panitia aktif). Login tiruan dari users.json (contoh). */
function Login() {
  const r = useRouter();
  const q = useSearchParams();
  const [role, setRole] = useState<"pengunjung" | "panitia">(q.get("peran") === "panitia" ? "panitia" : "pengunjung");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const afterLogin = (rl: "pengunjung" | "panitia" | "tamu") =>
    r.push(rl === "panitia" ? "/panitia" : localStorage.getItem(LOC_PREF) ? "/home" : "/izin-lokasi");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = users.find((x) => x.email === email.trim() && x.password === pw);
    if (!email || !pw) return setErr("Email dan password wajib diisi");
    const name = u?.name ?? email.split("@")[0];
    if (u && (u.role === "organizer") !== (role === "panitia")) return setErr(`Akun ini terdaftar sebagai ${u.role === "organizer" ? "Panitia" : "Pengunjung"}`);
    setSession({ userId: u?.id ?? `u-${Date.now()}`, role, name, email: email.trim() });
    afterLogin(role);
  };
  return (
    <main className="flex-1 overflow-y-auto px-6 pb-8 pt-10">
      <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-sky-200">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="#1E3A8A"><path d="M2 11 22 3l-7 19-3-8z" /></svg>
      </div>
      <h1 className="mt-4 text-center text-xl font-semibold text-primary">Login</h1>
      <p className="text-center text-xs text-ink-2">Tolong masukan email dan password</p>
      {q.get("perlu") === "login" && <div className="mt-4"><Banner>Scan QR & fitur ini memerlukan login. Mode tamu tidak dapat memindai QR.</Banner></div>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@contoh.id" autoComplete="email" />
        <div>
          <Field label="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••" autoComplete="current-password" />
          <Link href="/lupa-password" className="mt-2 inline-block text-xs text-primary">Lupa Password?</Link>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium">Masuk sebagai</p>
          <Toggle2 value={role} onChange={(v) => { setRole(v); setErr(""); }} options={[{ v: "pengunjung", label: "Pengunjung" }, { v: "panitia", label: "Panitia" }]} />
        </div>
        {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
        <Button type="submit">Login</Button>
      </form>
      <p className="mt-3 text-center text-xs text-ink-2">Demo (contoh): {role === "panitia" ? "panitia@contoh.id" : "pengunjung@contoh.id"} / demo123</p>
      {role === "pengunjung" && (
        <Button variant="secondary" className="mt-4" onClick={() => { setSession({ userId: "guest", role: "tamu", name: "Tamu", email: "-" }); afterLogin("tamu"); }}>
          Masuk sebagai tamu
        </Button>
      )}
      <p className="mt-6 text-center text-xs text-ink">Belum memiliki akun? <Link href="/daftar" className="font-semibold text-primary">Daftar sekarang</Link></p>
    </main>
  );
}
export default function Page() { return <Suspense><Login /></Suspense>; }
