"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header, Field, Button, Sheet } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { useToast } from "@/components/Toast";
import { useSession, initials } from "@/lib/auth";
import { ApiError, updateProfile } from "@/lib/api";

/** V-13a Edit Profil · V-13g Ubah Foto (action sheet) · V-13h Foto diperbarui (toast) · V-13b Profil tersimpan (toast) */
function EditForm({ s }: { s: NonNullable<ReturnType<typeof useSession>> }) {
  const r = useRouter();
  const toast = useToast();
  const [name, setName] = useState(s?.name ?? "");
  const [email, setEmail] = useState(s?.email ?? "");
  const [phone, setPhone] = useState(s?.phone ?? "");
  const [faculty, setFaculty] = useState(s?.faculty ?? "");
  const [err, setErr] = useState("");
  const [sheet, setSheet] = useState(false);
  const [photo, setPhoto] = useState(false); // unggah foto belum ada di API (avatarUrl) — hanya tampilan
  const pick = (v: boolean, msg: string) => { setPhoto(v); setSheet(false); toast(msg); };
  return (
    <Screen header={<Header title="Edit Profil" />}>
      <div className="flex flex-col items-center py-4">
        <span className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold ${photo ? "bg-gradient-to-br from-sky-300 to-primary text-white" : "bg-primary-soft text-primary"}`}>{initials(name || "?")}</span>
        <button onClick={() => setSheet(true)} className="mt-2 text-sm font-semibold text-primary">Ubah foto</button>
      </div>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setErr("");
        try { await updateProfile({ name, email, phone: phone || null, faculty: faculty || null }); toast("Profil tersimpan"); r.push("/profil"); }
        catch (x) { setErr(x instanceof ApiError ? Object.values(x.fields ?? {})[0] ?? x.message : "Gagal menyimpan"); }
      }}>
        <Field label="Nama" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="No. HP" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Field label="Fakultas" value={faculty} onChange={(e) => setFaculty(e.target.value)} />
        {err && <p role="alert" className="text-xs font-medium text-danger">{err}</p>}
        <Button type="submit">Simpan</Button>
        <Button type="button" variant="secondary" onClick={() => r.back()}>Batal</Button>
      </form>
      <Sheet open={sheet} onClose={() => setSheet(false)}>
        <h2 className="mb-3 text-base font-semibold">Ubah foto profil</h2>
        <div className="space-y-2">
          <Button variant="secondary" onClick={() => pick(true, "Foto diperbarui")}>Ambil foto</Button>
          <Button variant="secondary" onClick={() => pick(true, "Foto diperbarui")}>Pilih dari galeri</Button>
          <Button variant="ghost" className="!text-danger" onClick={() => pick(false, "Foto dihapus")}>Hapus foto</Button>
          <Button variant="ghost" onClick={() => setSheet(false)}>Batal</Button>
        </div>
      </Sheet>
    </Screen>
  );
}
export default function Edit() {
  const s = useSession();
  return s ? <EditForm key={s.userId} s={s} /> : <main className="flex flex-1 items-center justify-center text-sm text-ink-2">Memuat…</main>;
}
