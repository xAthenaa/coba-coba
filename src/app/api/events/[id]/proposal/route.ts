import { db } from "@/server/db";
import { E, noContent, ok, route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { ownedEvent } from "@/server/rules";
import { readPdfUpload, readProposal, removeProposal, saveProposal } from "@/server/files";

/** Surat pengajuan event (PDF ≤ 5 MB). Hanya panitia pemilik event & Admin — tidak publik. */
type P = { id: string };
export const GET = route<P>(async (_r, { id }) => {
  const u = await requireUser();
  const ev = await ownedEvent(id, u);
  if (!ev.proposalFile) throw E.notFound("Surat pengajuan belum diunggah");
  const buf = await readProposal(ev.proposalFile);
  if (!buf) throw E.notFound("File surat pengajuan tidak ditemukan");
  const name = (ev.proposalName ?? "surat-pengajuan.pdf").replace(/"/g, "");
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${name}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
export const POST = route<P>(async (req, { id }) => {
  const u = await requireUser();
  const ev = await ownedEvent(id, u);
  const { buf, original } = await readPdfUpload(req);
  const file = await saveProposal(buf);
  const at = new Date();
  await db.event.update({ where: { id }, data: { proposalFile: file, proposalName: original, proposalAt: at } });
  await removeProposal(ev.proposalFile);
  return ok({ name: original, uploadedAt: at, url: `/api/events/${id}/proposal` }, 201);
});
export const DELETE = route<P>(async (_r, { id }) => {
  const u = await requireUser();
  const ev = await ownedEvent(id, u);
  if (!ev.proposalFile) throw E.notFound("Surat pengajuan belum diunggah");
  await db.event.update({ where: { id }, data: { proposalFile: null, proposalName: null, proposalAt: null } });
  await removeProposal(ev.proposalFile);
  return noContent();
});
