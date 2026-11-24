"use client";
import { useState } from "react";
import { Guard } from "@/components/Guard";
import { Badge, Empty, Header } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { useToast } from "@/components/Toast";
import { ConfirmDelete } from "@/components/AdminConfirm";
import { deleteUser, updateUser, useAdminUsers, type AdminUser } from "@/lib/api";
import { useSession } from "@/lib/auth";

const ROLE_LABEL = { VISITOR: "Pengunjung", ORGANIZER: "Panitia", ADMIN: "Admin" } as const;

/** A-02 Kelola Pengguna — ubah peran, aktif/nonaktif, hapus. */
function Pengguna() {
  const [q, setQ] = useState("");
  const { data, isLoading, mutate } = useAdminUsers(q);
  const me = useSession();
  const toast = useToast();
  const [del, setDel] = useState<AdminUser | null>(null);
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); await mutate(); toast(ok); } catch (x) { toast(x instanceof Error ? x.message : "Gagal", "error"); } };
  const users = data ?? [];
  return (
    <Screen nav header={<Header title="Kelola Pengguna" backHref="/admin" />}>
      <input aria-label="Cari pengguna" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau email…" className="h-12 w-full rounded-lg border border-line bg-muted px-3 text-sm outline-none focus:border-primary" />
      <ul className="mt-4 space-y-3 pb-4">
        {users.map((u) => {
          const self = u.id === me?.userId;
          return (
            <li key={u.id} data-testid={`user-${u.email}`} className={`rounded-xl border border-line p-4 ${u.active ? "" : "bg-muted"}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{u.name}{self ? " (kamu)" : ""}</p><p className="truncate text-xs text-ink-2">{u.email}</p></div>
                <Badge tone={u.role === "ADMIN" ? "amber" : u.role === "ORGANIZER" ? "primary" : "gray"}>{ROLE_LABEL[u.role]}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {!u.active && <Badge tone="red">Nonaktif</Badge>}{u.google && <Badge tone="gray">Google</Badge>}
                {u.organizerName && <Badge tone="gray">{u.organizerName}</Badge>}<Badge tone="gray">{u.registrationCount} pendaftaran</Badge>
              </div>
              {!self && <div className="mt-3 flex items-center gap-2">
                <select aria-label={`Peran ${u.email}`} value={u.role} onChange={(e) => act(() => updateUser(u.id, { role: e.target.value }), "Peran diubah")}
                  className="h-9 flex-1 rounded-lg border border-line bg-muted px-2 text-xs">
                  {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button type="button" onClick={() => act(() => updateUser(u.id, { active: !u.active }), u.active ? "Akun dinonaktifkan" : "Akun diaktifkan")}
                  className="h-9 rounded-lg border border-primary px-3 text-xs font-semibold text-primary">{u.active ? "Nonaktifkan" : "Aktifkan"}</button>
                <button type="button" aria-label={`Hapus ${u.email}`} onClick={() => setDel(u)} className="h-9 rounded-lg border border-danger px-3 text-xs font-semibold text-danger">Hapus</button>
              </div>}
            </li>
          );
        })}
      </ul>
      {!isLoading && !users.length && <Empty title="Tidak ada pengguna" />}
      <ConfirmDelete item={del} onClose={() => setDel(null)} title="Hapus akun?" done="Akun dihapus"
        body={<>Akun &ldquo;{del?.email}&rdquo; beserta pendaftaran, notifikasi{del?.organizerName ? ", penyelenggara & seluruh event miliknya" : ""} akan dihapus permanen.</>}
        onConfirm={async () => { if (del) { await deleteUser(del.id); await mutate(); } }} />
    </Screen>
  );
}
export default function Page() { return <Guard allow={["admin"]} msg="Halaman khusus admin"><Pengguna /></Guard>; }
