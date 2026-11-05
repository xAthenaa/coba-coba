import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { E, ok, route } from "@/server/http";
import { requireOrganizer } from "@/server/auth";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const sniff = (b: Buffer) =>
  b[0] === 0xff && b[1] === 0xd8 ? "image/jpeg"
  : b.subarray(1, 4).toString() === "PNG" ? "image/png"
  : b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" ? "image/webp" : null;

/** Unggah poster event (panitia saja). multipart/form-data, field "file". */
export const POST = route(async (req) => {
  await requireOrganizer();
  let form: FormData;
  try { form = await req.formData(); } catch { throw E.validation({ file: "Kirim multipart/form-data dengan field file" }); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw E.validation({ file: "File wajib diisi" });
  if (!TYPES[file.type]) throw E.validation({ file: "Format harus JPG, PNG, atau WEBP" });
  if (file.size > MAX) throw E.validation({ file: "Ukuran maksimal 2 MB" });
  const buf = Buffer.from(await file.arrayBuffer());
  const real = sniff(buf);
  if (!real) throw E.validation({ file: "Isi file bukan gambar JPG/PNG/WEBP" });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${TYPES[real]}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return ok({ url: `/uploads/${name}` }, 201);
});
