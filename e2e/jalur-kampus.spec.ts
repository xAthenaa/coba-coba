import { test, expect, type Page } from "@playwright/test";

const SHOT_DIR = process.env.CAMPUS_SHOT_DIR ?? "/workspace";

async function login(page: Page) {
  await page.addInitScript(() => localStorage.setItem("wayo-loc-pref", "allow"));
  const res = await page.request.post("/api/auth/login", { data: { email: "pengunjung@contoh.id", password: "demo123" } });
  expect(res.status()).toBe(200);
}

test("rute Pascasarjana/Kantin → Gedung FK mengikuti jalur dalam kampus", async ({ page, context }) => {
  test.setTimeout(90_000);
  await context.setGeolocation({ latitude: -8.6720, longitude: 115.2190 });
  await login(page);
  await page.goto("/peta/rute/pl-fk");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  // Tunggu polyline rute (bukan hanya tile)
  await expect(page.locator(".leaflet-overlay-pane path").first()).toBeVisible({ timeout: 20_000 });
  // Tunggu ubin peta + perbandingan OSRM (rute kampus sudah tampil lebih dulu)
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2500);
  // Jarak kampus ~243 m (dibulatkan), bukan detour OSRM ~422 m
  await expect(page.getByText(/· \d{2,3} m · jalan kaki/)).toBeVisible({ timeout: 10_000 });
  const distText = await page.getByText(/· \d{2,3} m · jalan kaki/).innerText();
  const m = Number(/(\d{2,3}) m/.exec(distText)?.[1]);
  expect(m).toBeGreaterThanOrEqual(200);
  expect(m).toBeLessThan(320);
  const out = `${SHOT_DIR}/wayo-jalur-kampus-sudirman.png`;
  await page.screenshot({ path: out, fullPage: true });
});

test("rute gerbang Jimbaran → Rektorat tetap tampil", async ({ page, context }) => {
  test.setTimeout(90_000);
  await context.setGeolocation({ latitude: -8.7976237, longitude: 115.171076 });
  await login(page);
  await page.goto("/peta/rute/pl-jb-rektorat");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-overlay-pane path").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2500);
  await expect(page.getByText(/Rektorat/)).toBeVisible();
  const dist = page.getByText(/· \d+ m · jalan kaki|· \d,\d km · jalan kaki/);
  await expect(dist).toBeVisible({ timeout: 10_000 });
  const out = `${SHOT_DIR}/wayo-jalur-kampus-jimbaran.png`;
  await page.screenshot({ path: out, fullPage: true });
});
