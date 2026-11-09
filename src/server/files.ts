import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { E } from "./http";

/** Surat pengajuan event disimpan PRIVAT di data/proposals (tidak disajikan oleh /uploads). */
export const PROPOSAL_DIR = path.join(process.cwd(), "data", "proposals");
export const PROPOSAL_MAX = 5 * 1024 * 1024;
const NAME_RE = /^[a-z0-9-]+\.pdf$/;

/** Baca field "file" dari multipart dan validasi PDF (MIME + magic bytes %PDF-, maks 5 MB). */
export async function readPdfUpload(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { throw E.validation({ file: "Kirim multipart/form-data dengan field file" }); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw E.validation({ file: "File wajib diisi" });
  if (file.type && file.type !== "application/pdf") throw E.validation({ file: "Format surat pengajuan harus PDF" });
  if (file.size > PROPOSAL_MAX) throw E.validation({ file: "Ukuran maksimal 5 MB" });
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw E.validation({ file: "Isi file bukan PDF" });
  const original = (file.name || "surat-pengajuan.pdf").replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  return { buf, original: original.toLowerCase().endsWith(".pdf") ? original : `${original}.pdf` };
}
export async function saveProposal(buf: Buffer) {
  const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.pdf`;
  await mkdir(PROPOSAL_DIR, { recursive: true });
  await writeFile(path.join(PROPOSAL_DIR, name), buf);
  return name;
}
export async function readProposal(name: string) {
  if (!NAME_RE.test(name)) return null;
  try { return await readFile(path.join(PROPOSAL_DIR, name)); } catch { return null; }
}
export async function removeProposal(name?: string | null) {
  if (!name || !NAME_RE.test(name)) return;
  await unlink(path.join(PROPOSAL_DIR, name)).catch(() => {});
}
