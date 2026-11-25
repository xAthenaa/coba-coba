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
  await expect(page.locator(".leaflet-overlay-pane path").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2500);
  await expect(page.getByText(/· \d{2,3} m · jalan kaki/)).toBeVisible({ timeout: 10_000 });
  const distText = await page.getByText(/· \d{2,3} m · jalan kaki/).innerText();
  const m = Number(/(\d{2,3}) m/.exec(distText)?.[1]);
  expect(m).toBeGreaterThanOrEqual(200);
  expect(m).toBeLessThan(320);
  await page.screenshot({ path: `${SHOT_DIR}/wayo-jalur-kampus-luas-sudirman.png`, fullPage: true });
});

test("rute gerbang selatan Jimbaran → Fakultas Teknik mengikuti jalur kampus", async ({ page, context }) => {
  test.setTimeout(90_000);
  await context.setGeolocation({ latitude: -8.800121, longitude: 115.1707223 });
  await login(page);
  await page.goto("/peta/rute/pl-jb-halte-ft");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator(".leaflet-overlay-pane path").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2500);
  await expect(page.getByText(/Fakultas Teknik/)).toBeVisible();
  const dist = page.getByText(/· \d+ m · jalan kaki|· \d,\d km · jalan kaki/);
  await expect(dist).toBeVisible({ timeout: 10_000 });
  const text = await dist.innerText();
  const km = /(\d),(\d) km/.exec(text);
  const meters = /(\d{3,4}) m/.exec(text);
  const m = km ? Number(km[1]) * 1000 + Number(km[2]) * 100 : Number(meters?.[1] ?? 0);
  expect(m).toBeGreaterThanOrEqual(600);
  expect(m).toBeLessThan(1600);
  await page.screenshot({ path: `${SHOT_DIR}/wayo-jalur-kampus-luas-jimbaran.png`, fullPage: true });
});
