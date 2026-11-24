import nodemailer from "nodemailer";

/** Konfigurasi SMTP dari env. Bila SMTP_HOST kosong → mode dev: isi email dicetak ke console server. */
export const smtpConfigured = () => !!process.env.SMTP_HOST;

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  if (!smtpConfigured()) {
    console.log(`[WAYO mail:dev] SMTP belum diatur — email TIDAK dikirim.\n  Kepada: ${to}\n  Subjek: ${subject}\n  ${text.replace(/\n/g, "\n  ")}`);
    return { dev: true };
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER || "WAYO <no-reply@wayo.local>", to, subject, text, html });
  return { dev: false };
}
