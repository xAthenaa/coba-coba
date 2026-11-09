import { db } from "@/server/db";
import { E, ok, readJson, route } from "@/server/http";
import { isEmail } from "@/server/validate";
import { baseUrl, issueReset } from "@/server/reset";

const MSG = "Jika email terdaftar, tautan atur ulang kata sandi telah dikirim.";
/** Selalu 200 dengan pesan yang sama (tidak membocorkan email terdaftar). Email via SMTP; tanpa SMTP → tautan dicetak di console server. */
export const POST = route(async (req) => {
  const b = await readJson(req);
  if (!isEmail(b.email)) throw E.validation({ email: "Format email tidak valid" });
  const user = await db.user.findUnique({ where: { email: (b.email as string).trim().toLowerCase() } });
  if (user && user.active) {
    try { await issueReset(user, baseUrl(req)); } catch (e) { console.error("[WAYO] gagal mengirim email reset:", e); }
  }
  return ok({ message: MSG });
});
