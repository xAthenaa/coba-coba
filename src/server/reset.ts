import { randomBytes } from "node:crypto";
import { db } from "./db";
import { sha256 } from "./auth";
import { sendMail } from "./mail";

export const RESET_TTL_MS = 60 * 60 * 1000; // 1 jam
export const baseUrl = (req: Request) => (process.env.BASE_URL || new URL(req.url).origin).replace(/\/$/, "");

/** Buat token atur ulang (hanya hash disimpan; token lama yang belum dipakai dibatalkan) lalu kirim email. */
export async function issueReset(user: { id: string; email: string; name: string }, origin: string) {
  const token = randomBytes(32).toString("hex");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) } }),
  ]);
  const link = `${origin}/atur-ulang-password?token=${token}`;
  const text = `Halo ${user.name},\n\nKami menerima permintaan atur ulang kata sandi akun WAYO kamu.\nBuka tautan berikut (berlaku 1 jam, sekali pakai):\n${link}\n\nAbaikan email ini jika kamu tidak memintanya.`;
  const html = `<p>Halo ${user.name.replace(/[<>&]/g, "")},</p><p>Kami menerima permintaan atur ulang kata sandi akun WAYO kamu.</p><p><a href="${link}">Atur ulang kata sandi</a> (berlaku 1 jam, sekali pakai)</p><p>Abaikan email ini jika kamu tidak memintanya.</p>`;
  await sendMail(user.email, "Atur ulang kata sandi WAYO", text, html);
}
