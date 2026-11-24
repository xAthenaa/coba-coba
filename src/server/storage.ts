import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Penyimpanan file: Vercel Blob bila BLOB_READ_WRITE_TOKEN terisi, selain itu disk lokal (data/).
 * Poster (uploads) disajikan publik lewat /uploads/[name] — URL blob tidak pernah dikirim ke klien.
 * Surat pengajuan (proposals) privat: nama acak, hanya dilayani lewat API yang sudah cek otorisasi.
 */
export type StorageKind = "uploads" | "proposals";

const DISK: Record<StorageKind, string> = {
  uploads: path.join(process.cwd(), "data", "uploads"),
  proposals: path.join(process.cwd(), "data", "proposals"),
};

export const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const SAFE_NAME = /^[a-z0-9-]+\.[a-z0-9]+$/;
export function assertSafeName(name: string) {
  if (!SAFE_NAME.test(name)) throw new Error("Nama file tidak valid");
}

const blobPath = (kind: StorageKind, name: string) => `${kind}/${name}`;

/** Poster: prefer public (bisa di-cache). Proposal: prefer private. Store Vercel hanya satu jenis — fallback otomatis. */
const preferredAccess = (kind: StorageKind): "public" | "private" => (kind === "uploads" ? "public" : "private");

async function blobPut(kind: StorageKind, name: string, buf: Buffer, contentType: string) {
  const { put } = await import("@vercel/blob");
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const first = preferredAccess(kind);
  try {
    await put(blobPath(kind, name), buf, { access: first, addRandomSuffix: false, allowOverwrite: true, contentType, token });
  } catch {
    const second = first === "public" ? "private" : "public";
    await put(blobPath(kind, name), buf, { access: second, addRandomSuffix: false, allowOverwrite: true, contentType, token });
  }
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function blobGet(kind: StorageKind, name: string): Promise<Buffer | null> {
  const { get } = await import("@vercel/blob");
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const first = preferredAccess(kind);
  const second = first === "public" ? "private" : "public";
  for (const access of [first, second] as const) {
    try {
      const result = await get(blobPath(kind, name), { access, token });
      if (result?.statusCode === 200 && result.stream) return streamToBuffer(result.stream);
    } catch {
      /* coba access lain (store public-only atau private-only) */
    }
  }
  return null;
}

async function blobDel(kind: StorageKind, name: string) {
  const { del } = await import("@vercel/blob");
  try {
    await del(blobPath(kind, name), { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch {
    /* file mungkin sudah tidak ada */
  }
}

export async function putObject(kind: StorageKind, name: string, buf: Buffer, contentType: string) {
  assertSafeName(name);
  if (blobEnabled()) {
    await blobPut(kind, name, buf, contentType);
    return;
  }
  const dir = DISK[kind];
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);
}

export async function getObject(kind: StorageKind, name: string): Promise<Buffer | null> {
  if (!SAFE_NAME.test(name)) return null;
  if (blobEnabled()) return blobGet(kind, name);
  try { return await readFile(path.join(DISK[kind], name)); } catch { return null; }
}

export async function deleteObject(kind: StorageKind, name: string) {
  if (!SAFE_NAME.test(name)) return;
  if (blobEnabled()) { await blobDel(kind, name); return; }
  await unlink(path.join(DISK[kind], name)).catch(() => {});
}
