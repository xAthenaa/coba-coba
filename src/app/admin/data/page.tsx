"use client";
import { useState } from "react";
import { Guard } from "@/components/Guard";
import { Badge, Chip, Empty, Header } from "@/components/ui";
import { Screen } from "@/components/Screen";
import { ConfirmDelete } from "@/components/AdminConfirm";
import { adminDelete, deletePin, useAdminNotifications, useAdminPins, useAdminRegistrations } from "@/lib/api";
import { fmtDate, fmtTime } from "@/lib/data";

type Tab = "pendaftaran" | "pin" | "notifikasi";
type Row = { id: string; title: string; sub: string; badge?: string; del: () => Promise<void> };

/** A-06 Pengawasan & penghapusan data: pendaftaran event, pin, notifikasi. */
function Data() {
  const [tab, setTab] = useState<Tab>("pendaftaran");
  const regs = useAdminRegistrations(), pins = useAdminPins(), notifs = useAdminNotifications();
  const [del, setDel] = useState<Row | null>(null);
  const when = (iso: string) => `${fmtDate(iso)} ${fmtTime(iso)}`;
  const rows: Row[] = tab === "pendaftaran"
    ? (regs.data ?? []).map((r) => ({ id: r.id, title: `${r.user.name} → ${r.event.name}`, sub: `${r.user.email} · ${when(r.createdAt)}`, del: async () => { await adminDelete("registrations", r.id); await regs.mutate(); } }))
    : tab === "pin"
      ? (pins.data ?? []).map((p) => ({ id: p.id, title: p.label, sub: `${p.event.name} · ${p.type === "TIMED" ? "Berbasis waktu" : "Permanen"}`, badge: p.status, del: async () => { await deletePin(p.id, p.eventId); await pins.mutate(); } }))
      : (notifs.data ?? []).map((n) => ({ id: n.id, title: n.text, sub: `${n.user.email} · ${when(n.createdAt)}`, badge: n.read ? "dibaca" : "baru", del: async () => { await adminDelete("notifications", n.id); await notifs.mutate(); } }));
  const loading = tab === "pendaftaran" ? regs.isLoading : tab === "pin" ? pins.isLoading : notifs.isLoading;
  return (
    <Screen nav header={<Header title="Pengawasan Data" backHref="/admin" />}>
      <div className="flex gap-2">{(["pendaftaran", "pin", "notifikasi"] as Tab[]).map((t) => <Chip key={t} active={tab === t} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</Chip>)}</div>
      <ul className="mt-4 space-y-2 pb-4">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{r.title}</p><p className="text-xs text-ink-2">{r.sub}</p></div>
            {r.badge && <Badge tone="gray">{r.badge}</Badge>}
            <button type="button" aria-label={`Hapus ${r.title}`} onClick={() => setDel(r)} className="text-xs font-semibold text-danger">Hapus</button>
          </li>
        ))}
      </ul>
      {!loading && !rows.length && <Empty title="Tidak ada data" />}
      <ConfirmDelete item={del} onClose={() => setDel(null)} title="Hapus data ini?" body={<>&ldquo;{del?.title}&rdquo; akan dihapus permanen.</>} onConfirm={async () => { if (del) await del.del(); }} />
    </Screen>
  );
}
export default function Page() { return <Guard allow={["admin"]} msg="Halaman khusus admin"><Data /></Guard>; }
