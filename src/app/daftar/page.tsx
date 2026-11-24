"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Field, Toggle2, Header, Banner } from "@/components/ui";
import { GOOGLE_MSG, GoogleButton } from "@/components/GoogleButton";
import { register } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/Toast";

/** L-02 Daftar (L-02b = Panitia dipilih) */
function Daftar() {
  const r = useRouter();
  const q = useSearchParams();
  const google = q.get("google");
  const toast = useToast();
  const [role, setRole] = useState<"pengunjung" | "panitia">("pengunjung");
  const [f, setF] = useState({ name: "", email: "", pw: "" });
  const [err, setErr] = useState("");
  const [fe, setFe] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.email || f.pw.length < 8) return setErr("Lengkapi semua kolom (password minimal 8 karakter)");
    setBusy(true); setErr(""); setFe({});
    try {
      await register({ name: f.name, email: f.email, password: f.pw, role: role === "panitia" ? "ORGANIZER" : "VISITOR" });
      toast("Akun dibuat");
      r.replace(role === "panitia" ? "/panitia" : "/izin-lokasi");
    } catch (x) {
      if (x instanceof ApiError) { setErr(x.message); setFe(x.fields ?? {}); } else setErr("Gagal mendaftar");
      setBusy(false);
    }
  };
  return (
    <>
      <Header title="Daftar" backHref="/login" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        {google && GOOGLE_MSG[google] && <div className="mb-4"><Banner>{GOOGLE_MSG[google]}{google === "baru" && q.get("email") ? ` (${q.get("email")})` : ""}</Banner></div>}
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nama lengkap" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Field label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Field label="Password" type="password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} />
          <div><p className="mb-2 text-xs font-medium">Daftar sebagai</p>
            <Toggle2 value={role} onChange={setRole} options={[{ v: "pengunjung", label: "Pengunjung" }, { v: "panitia", label: "Panitia" }]} /></div>
          {Object.values(fe).length > 0 && <ul className="text-xs text-danger">{Object.entries(fe).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>}
          {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Memproses…" : "Daftar"}</Button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-ink-2"><span className="h-px flex-1 bg-line" />atau<span className="h-px flex-1 bg-line" /></div>
        <GoogleButton mode="daftar" role={role === "panitia" ? "ORGANIZER" : "VISITOR"} label={`Daftar dengan Google sebagai ${role === "panitia" ? "Panitia" : "Pengunjung"}`} />
        <p className="mt-6 text-center text-xs">Sudah punya akun? <Link href="/login" className="font-semibold text-primary">Masuk</Link></p>
      </main>
    </>
  );
}
export default function Page() { return <Suspense><Daftar /></Suspense>; }
