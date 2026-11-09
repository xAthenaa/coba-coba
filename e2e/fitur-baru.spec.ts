import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { startGoogleMock } from "../tests/google-mock.mjs";

/** Fitur baru: Admin, kuota, jadwal, surat pengajuan, reset password, Google OAuth, perbaikan navigasi. */
const uniq = Date.now().toString(36);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const toLocal = (h: number) => new Date(Date.now() + h * 3600e3 + 8 * 3600e3).toISOString().slice(0, 16);

async function apiLogin(page: Page, email: string, password = "demo123") {
  await page.addInitScript(() => localStorage.setItem("wayo-loc-pref", "allow"));
  const res = await page.request.post("/api/auth/login", { data: { email, password } });
  expect(res.status()).toBe(200);
}
function watch(page: Page) {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !/tile\.openstreetmap|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(e.message));
  return errs;
}

test("navigasi aktif /peta/navigasi/pl-auditorium tidak crash (rute dimuat async)", async ({ page }) => {
  const errs = watch(page);
  await apiLogin(page, "pengunjung@contoh.id");
  await page.goto("/peta/navigasi/pl-auditorium");
  await expect(page.getByRole("button", { name: "Akhiri" })).toBeVisible();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.waitForTimeout(2500);
  expect(errs).toEqual([]);
});

test("smoke admin: semua halaman admin tanpa error", async ({ page }) => {
  const errs = watch(page);
  await apiLogin(page, "admin@wayo.local", "admin123");
  for (const r of ["/admin", "/admin/pengguna", "/admin/event", "/admin/event/ev-invention", "/admin/tempat", "/admin/fasilitas", "/admin/data", "/profil", "/peta", "/home"]) {
    const res = await page.goto(r);
    expect(res?.status(), r).toBeLessThan(400);
    await expect(page, r).toHaveURL(new RegExp(r.replace(/\//g, "\\/") + "$"));
    await page.waitForTimeout(400);
  }
  expect(errs).toEqual([]);
});

test("admin: login form → dashboard; peran lain tidak bisa ke /admin", async ({ page, browser }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@wayo.local");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard Admin" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navbar Admin" })).toBeVisible();
  for (const [email, home] of [["pengunjung@contoh.id", /\/home$/], ["panitia@contoh.id", /\/panitia$/]] as const) {
    const ctx = await browser.newContext(); const p = await ctx.newPage();
    await apiLogin(p, email);
    await p.goto("/admin/pengguna");
    await expect(p).toHaveURL(home);
    await ctx.close();
  }
});

test("admin: kelola pengguna (ubah peran, nonaktifkan, hapus)", async ({ page }) => {
  const email = `e2e-user-${uniq}@contoh.id`;
  await page.request.post("/api/auth/register", { data: { name: "User E2E", email, password: "rahasia123" } });
  await page.context().clearCookies();
  await apiLogin(page, "admin@wayo.local", "admin123");
  await page.goto("/admin/pengguna");
  await page.getByLabel("Cari pengguna").fill(email);
  const card = page.getByTestId(`user-${email}`);
  await expect(card).toBeVisible();
  await card.getByLabel(`Peran ${email}`).selectOption("ORGANIZER");
  await expect(page.getByText("Peran diubah")).toBeVisible();
  await expect(card.locator("span").getByText("Panitia", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Nonaktifkan" }).click();
  await expect(card.getByText("Nonaktif", { exact: true })).toBeVisible();
  expect((await page.request.post("/api/auth/login", { data: { email, password: "rahasia123" } })).status()).toBe(403);
  await apiLogin(page, "admin@wayo.local", "admin123");
  await page.goto("/admin/pengguna");
  await page.getByLabel("Cari pengguna").fill(email);
  await page.getByRole("button", { name: `Hapus ${email}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByText("Akun dihapus")).toBeVisible();
  await expect(page.getByTestId(`user-${email}`)).toHaveCount(0);
});

test("admin: kelola tempat (tambah via tap peta, hapus ditolak bila dipakai event) & fasilitas", async ({ page }) => {
  await apiLogin(page, "admin@wayo.local", "admin123");
  await page.goto("/admin/tempat");
  await page.getByRole("button", { name: "+ Tempat" }).click();
  const form = page.getByRole("form", { name: "Form tempat" });
  await form.getByLabel("Nama tempat").fill(`Gedung E2E ${uniq}`);
  await page.waitForTimeout(1200);
  const lat0 = await form.getByLabel("Latitude").inputValue();
  await form.locator(".leaflet-container").click({ position: { x: 40, y: 60 } });
  await expect(form.getByLabel("Latitude")).not.toHaveValue(lat0);
  await form.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText("Tempat ditambahkan")).toBeVisible();
  await expect(page.getByText(`Gedung E2E ${uniq}`)).toBeVisible();
  // hapus tempat yang dipakai event → pesan jelas
  await page.getByRole("button", { name: "Hapus tempat Gedung FEB (contoh)" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("masih dipakai");
  await page.getByRole("dialog").getByRole("button", { name: "Batal" }).click();
  // hapus tempat baru → berhasil
  await page.getByRole("button", { name: `Hapus tempat Gedung E2E ${uniq}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByText("Tempat dihapus")).toBeVisible();
  await expect(page.getByText(`Gedung E2E ${uniq}`)).toHaveCount(0);

  await page.goto("/admin/fasilitas");
  await expect(page.getByText("Toilet Auditorium").first()).toBeVisible();
  await page.getByRole("button", { name: "+ Fasilitas" }).click();
  const ff = page.getByRole("form", { name: "Form fasilitas" });
  await ff.getByLabel("Nama fasilitas").fill(`ATM E2E ${uniq}`);
  await ff.getByLabel("Jenis").selectOption("ATM");
  await ff.getByLabel("Lokasi (tempat)").selectOption("pl-info");
  await ff.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText("Fasilitas ditambahkan")).toBeVisible();
  await page.getByRole("button", { name: `Hapus fasilitas ATM E2E ${uniq}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByText("Fasilitas dihapus")).toBeVisible();
});

test("panitia: tambah event dengan kuota + surat PDF; jadwal; pengunjung lihat sisa kuota & jadwal, kuota penuh", async ({ page, browser }) => {
  await apiLogin(page, "panitia@contoh.id");
  await page.goto("/panitia/event/baru");
  await page.getByLabel("Nama event").fill(`Kuota E2E ${uniq}`);
  await page.getByLabel("Mulai").fill(toLocal(24));
  await page.getByLabel("Selesai").fill(toLocal(27));
  await page.getByLabel("Pilih lokasi dari daftar").selectOption("pl-auditorium");
  await page.getByLabel(/Kuota peserta/).fill("1");
  await page.getByLabel("Unggah surat pengajuan").setInputFiles({ name: "surat-e2e.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.getByText("surat-e2e.pdf")).toBeVisible();
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page).toHaveURL(/\/panitia\/event\/(?!baru)[^/]+$/);
  const id = page.url().split("/").pop()!;
  await expect(page.getByText("Kuota: 1 peserta · sisa 1")).toBeVisible();
  await expect(page.getByRole("link", { name: "surat-e2e.pdf" })).toBeVisible();
  const pdf = await page.request.get(`/api/events/${id}/proposal`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  // jadwal
  await page.getByRole("link", { name: /Jadwal Kegiatan/ }).click();
  await expect(page).toHaveURL(new RegExp(`/panitia/event/${id}/jadwal$`));
  await page.getByRole("button", { name: "+ Tambah Jadwal" }).click();
  await page.getByRole("dialog").getByLabel("Judul sesi").fill("Pembukaan E2E");
  await page.getByRole("dialog").getByLabel("Mulai").fill(toLocal(24));
  await page.getByRole("dialog").getByLabel("Selesai").fill(toLocal(25));
  await page.getByRole("dialog").getByLabel("Pembicara (opsional)").fill("Rektor (contoh)");
  await page.getByRole("dialog").getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText("Jadwal ditambahkan")).toBeVisible();
  await expect(page.getByText("Pembukaan E2E")).toBeVisible();

  // pengunjung 1: lihat sisa kuota + jadwal, daftar
  const c1 = await browser.newContext(); const v1 = await c1.newPage();
  await apiLogin(v1, "pengunjung@contoh.id");
  expect((await v1.request.get(`/api/events/${id}/proposal`)).status()).toBe(403);
  await v1.goto(`/event/${id}`);
  await expect(v1.getByText(/Sisa kuota/)).toContainText("1");
  await expect(v1.getByRole("heading", { name: "Jadwal Kegiatan" })).toBeVisible();
  await expect(v1.getByText("Pembukaan E2E")).toBeVisible();
  await v1.getByRole("button", { name: "Daftar Sekarang" }).click();
  await expect(v1.getByText("Kamu terdaftar")).toBeVisible();
  // pengunjung 2: kuota penuh
  const c2 = await browser.newContext(); const v2 = await c2.newPage();
  await v2.request.post("/api/auth/register", { data: { name: "Pengunjung Kuota", email: `kuota-${uniq}@contoh.id`, password: "rahasia123" } });
  await v2.goto(`/event/${id}`);
  await expect(v2.getByText("Kuota penuh (1 peserta)")).toBeVisible();
  await expect(v2.getByRole("button", { name: "Kuota penuh" })).toBeDisabled();
  expect((await v2.request.post(`/api/events/${id}/register`)).status()).toBe(409);
  await c1.close(); await c2.close();
  await page.request.delete(`/api/events/${id}`);
});

test("lupa password → email (dev log) → atur ulang password via tautan → login dengan password baru", async ({ page }) => {
  const email = `reset-${uniq}@contoh.id`;
  const reg = await page.request.post("/api/auth/register", { data: { name: "Reset E2E", email, password: "rahasia123" } });
  const userId = (await reg.json()).data.id;
  await page.context().clearCookies();
  await page.goto("/lupa-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Kirim Tautan" }).click();
  await expect(page.getByText("Tautan terkirim")).toBeVisible();
  // Token asli hanya dikirim lewat email/log; untuk tes, buat token yang diketahui langsung di DB (hash SHA-256).
  const db = new PrismaClient();
  const raw = randomBytes(32).toString("hex");
  await db.passwordResetToken.create({ data: { userId, tokenHash: createHash("sha256").update(raw).digest("hex"), expiresAt: new Date(Date.now() + 3600e3) } });
  await db.$disconnect();
  await page.goto("/atur-ulang-password?token=ngawur");
  await expect(page.getByText("Tautan tidak valid")).toBeVisible();
  await page.goto(`/atur-ulang-password?token=${raw}`);
  await page.getByLabel("Password baru", { exact: true }).fill("passwordbaru1");
  await page.getByLabel("Ulangi password baru").fill("passwordbaru2");
  await page.getByRole("button", { name: "Simpan Password" }).click();
  await expect(page.getByText("Konfirmasi password tidak sama")).toBeVisible();
  await page.getByLabel("Ulangi password baru").fill("passwordbaru1");
  await page.getByRole("button", { name: "Simpan Password" }).click();
  await expect(page.getByText("Password diperbarui")).toBeVisible();
  await page.goto(`/atur-ulang-password?token=${raw}`);
  await expect(page.getByText("Tautan tidak valid")).toBeVisible(); // sekali pakai
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("passwordbaru1");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/(home|izin-lokasi)$/);
});

test.describe("Google OAuth", () => {
  test("tombol Google di Login & Daftar (mock OAuth bila dikonfigurasi, pesan jelas bila belum)", async ({ page }) => {
    const configured = (await (await page.request.get("/api/auth/google/status")).json()).data.configured;
    await page.goto("/login");
    if (!configured) {
      await page.getByRole("button", { name: "Masuk dengan Google" }).click();
      await expect(page.getByText(/Login dengan Google belum dikonfigurasi/)).toBeVisible();
      await page.goto("/daftar");
      await page.getByRole("button", { name: /Daftar dengan Google/ }).click();
      await expect(page.getByText(/Login dengan Google belum dikonfigurasi/)).toBeVisible();
      await page.goto("/api/auth/google?mode=login");
      await expect(page).toHaveURL(/\/login\?google=off$/);
      await expect(page.getByText(/belum dikonfigurasi/).first()).toBeVisible();
      return;
    }
    const mock = await startGoogleMock();
    try {
      const email = `g-e2e-${uniq}@gmail.test`;
      mock.setProfile({ sub: `g-e2e-${uniq}`, email, email_verified: true, name: "Google E2E" });
      await page.getByRole("button", { name: "Masuk dengan Google" }).click();
      await expect(page).toHaveURL(/\/daftar\?google=baru/);
      await expect(page.getByText(/belum terdaftar/)).toBeVisible();
      await page.getByRole("button", { name: "Panitia" }).click();
      await page.getByRole("button", { name: "Daftar dengan Google sebagai Panitia" }).click();
      await expect(page).toHaveURL(/\/panitia$/);
      const me = await (await page.request.get("/api/me")).json();
      expect(me.data.email).toBe(email);
      expect(me.data.role).toBe("ORGANIZER");
      expect(me.data.google).toBe(true);
      // keluar lalu masuk lagi dengan Google → langsung ke /panitia
      await page.request.post("/api/auth/logout");
      await page.goto("/login");
      await page.getByRole("button", { name: "Masuk dengan Google" }).click();
      await expect(page).toHaveURL(/\/panitia$/);
      // bersihkan
      const ctx = page.context(); await ctx.clearCookies();
      await apiLogin(page, "admin@wayo.local", "admin123");
      expect((await page.request.delete(`/api/admin/users/${me.data.id}`)).status()).toBe(204);
    } finally { await mock.close(); }
  });
});
