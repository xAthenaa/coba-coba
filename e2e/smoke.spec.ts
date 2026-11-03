import { test, expect, type Page } from "@playwright/test";

const visitor = ["/home", "/home?fakultas=Teknik", "/event/ev-invention", "/event/ev-pkkmb", "/event-saya", "/penyelenggara", "/penyelenggara/org-ft",
  "/peta", "/peta?kategori=toilet", "/peta?fokus=pl-auditorium", "/peta/cari", "/peta/tempat/pl-auditorium", "/peta/tempat/pin-booth-reg",
  "/peta/rute/pl-auditorium", "/peta/navigasi/pl-auditorium", "/peta/tiba/pl-auditorium", "/peta/event/ev-invention", "/scan",
  "/notifikasi", "/profil", "/profil/edit", "/profil/pengaturan", "/profil/faq", "/profil/tentang"];
const panitia = ["/panitia", "/panitia/event/baru", "/panitia/event/ev-invention", "/panitia/event/ev-invention/edit", "/panitia/event/ev-invention/pin",
  "/panitia/event/ev-invention/pin/baru", "/panitia/event/ev-invention/pin/pin-booth-reg", "/panitia/event/ev-invention/qr"];
const pub = ["/", "/login", "/daftar", "/lupa-password", "/izin-lokasi"];

/** Login sungguhan lewat API (cookie httpOnly dibagi dengan konteks browser). */
async function login(page: Page, role: "pengunjung" | "panitia") {
  await page.addInitScript(() => localStorage.setItem("wayo-loc-pref", "allow"));
  const res = await page.request.post("/api/auth/login", { data: { email: `${role}@contoh.id`, password: "demo123" } });
  expect(res.status()).toBe(200);
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

test("tanpa mode tamu: halaman terlindungi → /login?next=", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /tamu/i })).toHaveCount(0);
  for (const p of ["/home", "/scan", "/peta", "/panitia"]) {
    await page.goto(p);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(p)}`));
  }
});

test("login via form (sungguhan) + logout", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("wayo-loc-pref", "allow"));
  await page.goto("/login");
  await page.getByLabel("Email").fill("pengunjung@contoh.id");
  await page.getByLabel("Password").fill("salah-sekali");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("Email atau kata sandi salah")).toBeVisible();
  await page.getByLabel("Password").fill("demo123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText("Pengunjung Demo")).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "wayo_session")?.httpOnly).toBe(true);
  await page.goto("/profil");
  await page.getByRole("button", { name: "Keluar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("peran: pengunjung tidak bisa ke /panitia, panitia tidak bisa ke /scan", async ({ page, browser }) => {
  await login(page, "pengunjung");
  await page.goto("/panitia");
  await expect(page).toHaveURL(/\/home/);
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await login(p2, "panitia");
  await p2.goto("/scan");
  await expect(p2).toHaveURL(/\/panitia/);
  await ctx.close();
});

test("V-11 Penyelenggara terjangkau dari Home (klik), Detail Event, dan Profil", async ({ page }) => {
  await login(page, "pengunjung");
  await page.goto("/home");
  await page.getByRole("link", { name: "Lainnya ›" }).click();
  await expect(page).toHaveURL(/\/penyelenggara$/);
  await expect(page.getByRole("heading", { name: "Penyelenggara" })).toBeVisible();
  await page.getByRole("link", { name: /Fakultas Teknik|FT|Teknik/ }).first().click();
  await expect(page).toHaveURL(/\/penyelenggara\/org-/);
  await page.goto("/event/ev-invention");
  await page.getByRole("link", { name: /›$/ }).first().click();
  await expect(page).toHaveURL(/\/penyelenggara\/org-ft/);
  await page.goto("/event/ev-invention");
  await page.getByRole("link", { name: "Lihat semua penyelenggara" }).click();
  await expect(page).toHaveURL(/\/penyelenggara$/);
  await page.goto("/profil");
  await page.getByRole("link", { name: "Penyelenggara" }).click();
  await expect(page).toHaveURL(/\/penyelenggara$/);
});

test("QR asli: /q/[code] → peta event; QR lama setelah regenerate → tidak valid", async ({ page, browser }) => {
  const ctx = await browser.newContext();
  const org = await ctx.newPage();
  await login(org, "panitia");
  const qr = (await (await org.request.get("/api/events/ev-invention/qr")).json()).data;
  expect(qr.url).toContain(`/q/${qr.code}`);
  // belum login → login?next=/q/code → setelah login kembali ke peta event
  await page.addInitScript(() => localStorage.setItem("wayo-loc-pref", "allow"));
  await page.goto(`/q/${qr.code}`);
  await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(`/q/${qr.code}`)}`));
  await page.getByLabel("Email").fill("pengunjung@contoh.id");
  await page.getByLabel("Password").fill("demo123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/peta\/event\/ev-invention/);
  await expect(page.getByText(/Peta dari QR/)).toBeVisible();
  // panitia buat ulang QR → kode lama tidak valid
  await org.goto("/panitia/event/ev-invention/qr");
  await org.getByRole("button", { name: "Buat ulang QR" }).click();
  await org.getByRole("button", { name: "Buat ulang", exact: true }).click();
  await expect(org.getByText("QR baru dibuat")).toBeVisible();
  await page.goto(`/q/${qr.code}`);
  await expect(page.getByText("QR tidak valid")).toBeVisible();
  // input manual kode lama di halaman scan juga ditolak
  await page.goto("/scan");
  await page.getByRole("button", { name: "Izinkan" }).click();
  await page.getByLabel("Kode QR manual").fill(qr.url);
  await page.getByRole("button", { name: "Buka" }).click();
  await expect(page.getByRole("dialog")).toContainText("QR tidak valid");
  await ctx.close();
});

test("panitia: buat event → tambah pin → pengunjung daftar & dapat notifikasi PIN_NEW", async ({ page, browser }) => {
  const ctx = await browser.newContext();
  const org = await ctx.newPage();
  await login(org, "panitia");
  const start = new Date(Date.now() + 2 * 864e5).toISOString(), end = new Date(Date.now() + 2 * 864e5 + 3 * 3600e3).toISOString();
  const ev = (await (await org.request.post("/api/events", { data: { name: "Event E2E", faculty: "Teknik", placeId: "pl-auditorium", startAt: start, endAt: end } })).json()).data;
  await login(page, "pengunjung");
  await page.goto(`/event/${ev.id}`);
  await page.getByRole("button", { name: "Daftar Sekarang" }).click();
  await expect(page.getByText("Kamu terdaftar")).toBeVisible();
  await expect(page).toHaveURL(/\/event-saya/);
  await expect(page.getByRole("heading", { name: "Event E2E" })).toBeVisible();
  await org.goto(`/panitia/event/${ev.id}/pin/baru`);
  await org.waitForTimeout(1500);
  await org.locator(".leaflet-container").click({ position: { x: 200, y: 120 } });
  await org.getByLabel("Label pin").fill("Pos E2E");
  await org.getByRole("button", { name: "Permanen" }).click();
  await org.getByRole("button", { name: "Simpan" }).click();
  await expect(org).toHaveURL(new RegExp(`/panitia/event/${ev.id}/pin$`));
  await expect(org.getByText("Pos E2E")).toBeVisible();
  await page.goto("/notifikasi");
  await expect(page.getByText(/Pin baru "Pos E2E"/)).toBeVisible();
  await org.request.delete(`/api/events/${ev.id}`);
  await ctx.close();
});

test("flow: scan simulasi → peta dari QR", async ({ page }) => {
  await login(page, "pengunjung");
  await page.goto("/scan");
  await page.getByRole("button", { name: "Izinkan" }).click();
  await page.getByRole("button", { name: /Simulasi scan/ }).click();
  await expect(page).toHaveURL(/\/peta\/event\//);
  await expect(page.getByText(/Peta dari QR/)).toBeVisible();
});
