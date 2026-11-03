"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header, Field, Button, Sheet } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { useToast } from "@/components/Toast";
import { useSession, initials } from "@/lib/auth";
import { useDB, writeDB } from "@/lib/store";

/** V-13a Edit Profil · V-13g Ubah Foto (action sheet) · V-13h Foto diperbarui (toast) · V-13b Profil tersimpan (toast) */
export default function Edit() {
  const s = useSession();
  const db = useDB();
  const r = useRouter();
  const toast = useToast();
  const [name, setName] = useState(db.profile?.name ?? s?.name ?? "");
  const [email, setEmail] = useState(db.profile?.email ?? s?.email ?? "");
  const [sheet, setSheet] = useState(false);
  const [photo, setPhoto] = useState(db.profile?.photo ?? false);
  const pick = (v: boolean, msg: string) => { setPhoto(v); setSheet(false); toast(msg); };
  return (
    <Screen header={<Header title="Edit Profil" />}>
      <div className="flex flex-col items-center py-4">
        <span className={`flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold ${photo ? "bg-gradient-to-br from-sky-300 to-primary text-white" : "bg-primary-soft text-primary"}`}>{initials(name || "?")}</span>
        <button onClick={() => setSheet(true)} className="mt-2 text-sm font-semibold text-primary">Ubah foto</button>
      </div>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); writeDB((d) => ({ ...d, profile: { name, email, photo } })); toast("Profil tersimpan"); r.push("/profil"); }}>
        <Field label="Nama" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
