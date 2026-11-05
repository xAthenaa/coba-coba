import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, role: "pengunjung" | "panitia") {
  await page.addInitScript(() => localStorage.setItem("wayo-loc-pref", "allow"));
  const res = await page.request.post("/api/auth/login", { data: { email: `${role}@contoh.id`, password: "demo123" } });
  expect(res.status()).toBe(200);
}

test("panitia: tambah pin lewat UI lalu hapus via dialog konfirmasi (Batal → Hapus)", async ({ page }) => {
  await login(page, "panitia");
  const label = `Pin Hapus ${Date.now().toString(36)}`;
  await page.goto("/panitia/event/ev-invention/pin/baru");
  await page.waitForTimeout(1500);
  await page.locator(".leaflet-container").click({ position: { x: 200, y: 120 } });
  await page.getByLabel("Label pin").fill(label);
  await page.getByRole("button", { name: "Permanen" }).click();
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page).toHaveURL(/\/panitia\/event\/ev-invention\/pin$/);
  await expect(page.getByText(label)).toBeVisible();

  await page.getByRole("button", { name: `Hapus pin ${label}` }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByText("Hapus pin ini?")).toBeVisible();
  await dlg.getByRole("button", { name: "Batal" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(label)).toBeVisible();

  await page.getByRole("button", { name: `Hapus pin ${label}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(page.getByText(label)).toHaveCount(0);
  const list = (await (await page.request.get("/api/events/ev-invention/pins")).json()).data as { label: string }[];
  expect(list.some((p) => p.label === label)).toBe(false);
});

test("peta: toggle Kampus Jimbaran menampilkan marker tempat", async ({ page }) => {
  await login(page, "pengunjung");
  await page.goto("/peta");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "KAMPUS JIMBARAN" }).click();
  await expect(page.getByText("Belum ada tempat di Kampus Jimbaran")).toHaveCount(0);
  await expect.poll(async () => page.locator(".leaflet-marker-icon").count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(10);
});
