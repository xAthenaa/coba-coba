import { test, expect } from "@playwright/test";

const PNG1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("panitia: Tambah Event — tap titik di peta menetapkan lokasi + unggah poster tampil pratinjau", async ({ page }) => {
  const res = await page.request.post("/api/auth/login", { data: { email: "panitia@contoh.id", password: "demo123" } });
  expect(res.status()).toBe(200);
  await page.goto("/panitia/event/baru");
  await expect(page.getByText("belum dipilih")).toBeVisible();
  await page.waitForTimeout(1500);
  const map = page.locator(".leaflet-container");
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: 25, y: box.height / 2 + 30 } }); // titik kosong (bukan pin/atribusi)
  await expect(page.getByText("belum dipilih")).toHaveCount(0);
  await expect(page.getByLabel("Pilih lokasi dari daftar")).not.toHaveValue("");

  await page.getByLabel("Unggah poster").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: PNG1 });
  await expect(page.getByAltText("Pratinjau poster")).toHaveAttribute("src", /^\/uploads\/.+\.png$/);
});
