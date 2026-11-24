"use client";
import { useState } from "react";
import { Button, Modal } from "./ui";
import { useToast } from "./Toast";

/** Dialog konfirmasi hapus (Admin) — menampilkan pesan galat server (mis. tempat masih dipakai). */
export function ConfirmDelete({ item, title, body, onConfirm, onClose, done = "Data dihapus" }: {
  item: unknown; title: string; body: React.ReactNode; onConfirm: () => Promise<void>; onClose: () => void; done?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Modal open={!!item} onClose={() => { if (!busy) { setErr(""); onClose(); } }}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-ink-2">{body}</p>
      {err && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-xs font-medium text-red-800">{err}</p>}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" disabled={busy} onClick={() => { setErr(""); onClose(); }}>Batal</Button>
        <Button variant="danger" disabled={busy} onClick={async () => {
          setBusy(true); setErr("");
          try { await onConfirm(); toast(done); onClose(); } catch (x) { setErr(x instanceof Error ? x.message : "Gagal menghapus"); } finally { setBusy(false); }
        }}>Hapus</Button>
      </div>
    </Modal>
  );
}
