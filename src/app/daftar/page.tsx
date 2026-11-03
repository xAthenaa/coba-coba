"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Toggle2, Header } from "@/components/ui";
import { setSession } from "@/lib/auth";
import { useToast } from "@/components/Toast";

/** L-02 Daftar (L-02b = Panitia dipilih) */
export default function Daftar() {
  const r = useRouter();
  const toast = useToast();
  const [role, setRole] = useState<"pengunjung" | "panitia">("pengunjung");
  const [f, setF] = useState({ name: "", email: "", pw: "" });
  const [err, setErr] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name || !f.email || f.pw.length < 6) return setErr("Lengkapi semua kolom (password minimal 6 karakter)");
    setSession({ userId: `u-${Date.now()}`, role, name: f.name, email: f.email });
    toast("Akun dibuat (simulasi)");
    r.push(role === "panitia" ? "/panitia" : "/izin-lokasi");
  };
  return (
    <>
      <Header title="Daftar" backHref="/login" />
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nama lengkap" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Field label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Field label="Password" type="password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} />
          <div><p className="mb-2 text-xs font-medium">Daftar sebagai</p>
            <Toggle2 value={role} onChange={setRole} options={[{ v: "pengunjung", label: "Pengunjung" }, { v: "panitia", label: "Panitia" }]} /></div>
          {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
          <Button type="submit">Daftar</Button>
        </form>
        <p className="mt-6 text-center text-xs">Sudah punya akun? <Link href="/login" className="font-semibold text-primary">Masuk</Link></p>
      </main>
    </>
  );
}
