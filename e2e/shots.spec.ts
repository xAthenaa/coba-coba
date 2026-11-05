import { test, type Page } from "@playwright/test";
const OUT = process.env.SHOTS_DIR ?? "../shots";
async function login(page: Page, role: string) {
  await page.addInitScript(() => localStorage.setItem("wayo-loc-pref", "allow"));
  await page.context().clearCookies();
  await page.request.post("/api/auth/login", { data: { email: `${role}@contoh.id`, password: "demo123" } });
}
const shot = async (page: Page, name: string, wait = 1500) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}/${name}.png` }); };

test.skip(!process.env.SHOTS, "set SHOTS=1 to capture screenshots");
test("screenshots", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/"); await shot(page, "S-00_splash", 300);
  await page.goto("/login"); await shot(page, "L-01_login", 500);

  await page.goto("/izin-lokasi"); await shot(page, "L-03_izin-lokasi", 500);
  await page.goto("/lupa-password"); await shot(page, "L-05_lupa-password", 500);
  await login(page, "pengunjung");
  for (const [r, n, w] of [["/home", "V-01_home"], ["/home?lokasi=mati", "V-01b_home-lokasi-mati"], ["/event/ev-invention", "V-02_detail-event"], ["/event/ev-pkkmb", "V-02c_event-selesai"],
    ["/peta", "V-03_peta", 3500], ["/peta?kategori=toilet", "V-03t_peta-toilet", 3500], ["/peta?lokasi=offline", "V-03c_peta-offline", 3500], ["/peta/event/ev-invention", "V-03q_peta-dari-qr", 3500],
    ["/peta/cari", "V-04_cari"], ["/peta/tempat/pl-auditorium", "V-05_detail-tempat", 3000], ["/peta/tempat/pin-booth-reg", "V-05b_pin-waktu", 3000],
    ["/peta/rute/pl-kantin-fmipa", "V-06_pratinjau-rute", 3500], ["/peta/navigasi/pl-kantin-fmipa", "V-07_navigasi", 6000], ["/peta/tiba/pl-auditorium", "V-08_tiba"],
    ["/event-saya", "V-09_event-saya"], ["/scan", "V-10a_izin-kamera"], ["/penyelenggara", "V-11_penyelenggara"], ["/penyelenggara/org-ft", "V-12_detail-penyelenggara"],
    ["/notifikasi", "L-04_notifikasi"], ["/profil", "V-13_profil"]] as [string, string, number?][]) { await page.goto(r); await shot(page, n, w); }
  await page.goto("/scan"); await page.getByRole("button", { name: "Izinkan" }).click(); await shot(page, "V-10_scan", 1500);
  await page.getByRole("button", { name: /QR tidak valid/ }).click(); await shot(page, "V-10b_qr-tidak-valid", 500);
  await login(page, "panitia");
  for (const [r, n, w] of [["/panitia", "P-01_kelola"], ["/panitia/event/baru", "P-02_tambah-event", 3000], ["/panitia/event/ev-invention", "P-03_detail-event-panitia"],
    ["/panitia/event/ev-invention/pin", "P-04_daftar-pin"], ["/panitia/event/ev-invention/pin/pin-booth-reg", "P-05_pin-waktu", 3000], ["/panitia/event/ev-invention/qr", "P-06_qr-peta"]] as [string, string, number?][]) { await page.goto(r); await shot(page, n, w); }
  await page.getByRole("button", { name: /Cetak/ }).click(); await shot(page, "P-06c_pratinjau-cetak", 800);
  await page.goto("/panitia/event/ev-invention"); await page.getByRole("button", { name: /Hapus/ }).click(); await shot(page, "P-07_hapus-event", 500);
});
