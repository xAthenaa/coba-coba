import { test, expect, type Page } from "@playwright/test";

const visitor = ["/home", "/home?fakultas=Teknik", "/event/ev-invention", "/event/ev-pkkmb", "/event-saya", "/penyelenggara", "/penyelenggara/org-ft",
  "/peta", "/peta?kategori=toilet", "/peta?fokus=pl-auditorium", "/peta/cari", "/peta/tempat/pl-auditorium", "/peta/tempat/pin-booth-reg",
  "/peta/rute/pl-auditorium", "/peta/navigasi/pl-auditorium", "/peta/tiba/pl-auditorium", "/peta/event/ev-invention", "/scan",
  "/notifikasi", "/profil", "/profil/edit", "/profil/pengaturan", "/profil/faq", "/profil/tentang"];
const panitia = ["/panitia", "/panitia/event/baru", "/panitia/event/ev-invention", "/panitia/event/ev-invention/edit", "/panitia/event/ev-invention/pin",
  "/panitia/event/ev-invention/pin/baru", "/panitia/event/ev-invention/pin/pin-booth-reg", "/panitia/event/ev-invention/qr"];
const pub = ["/", "/login", "/daftar", "/lupa-password", "/izin-lokasi"];

async function login(page: Page, role: "pengunjung" | "panitia") {
  await page.goto("/login");
  await page.evaluate((r) => {
    localStorage.setItem("wayo_session", JSON.stringify({ userId: r === "panitia" ? "u-panitia" : "u-pengunjung", role: r, name: r === "panitia" ? "Panitia Demo" : "Pengunjung Demo", email: `${r}@contoh.id` }));
    localStorage.setItem("wayo-loc-pref", "allow");
  }, role);
}
function watch(page: Page) {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !/tile\.openstreetmap|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(e.message));
  return errs;
}

for (const [role, routes] of [["publik", pub], ["pengunjung", visitor], ["panitia", panitia]] as const) {
  test(`smoke ${role}`, async ({ page }) => {
    const errs = watch(page);
    if (role !== "publik") await login(page, role);
    for (const r of routes) {
      const res = await page.goto(r);
      expect(res?.status(), r).toBeLessThan(400);
      await page.waitForTimeout(400);
    }
    expect(errs).toEqual([]);
  });
}

test("guest cannot scan", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Masuk sebagai tamu" }).click();
  await page.goto("/scan");
  await expect(page).toHaveURL(/\/login\?perlu=login/);
});

test("flow: scan simulasi → peta dari QR", async ({ page }) => {
  await login(page, "pengunjung");
  await page.goto("/scan");
  await page.getByRole("button", { name: "Izinkan" }).click();
  await page.getByRole("button", { name: /Simulasi scan/ }).click();
  await expect(page).toHaveURL(/\/peta\/event\//);
  await expect(page.getByText(/Peta dari QR/)).toBeVisible();
});
