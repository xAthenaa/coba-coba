import { ok, route } from "@/server/http";
// Selalu 200 agar tidak membocorkan email terdaftar. Pengiriman email belum diimplementasikan (lihat README).
export const POST = route(async (req) => {
  await req.text().catch(() => "");
  return ok({ message: "Jika email terdaftar, tautan atur ulang kata sandi telah dikirim." });
});
