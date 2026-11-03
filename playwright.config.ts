import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 1,
    geolocation: { latitude: -8.6736, longitude: 115.2228 },
    permissions: ["geolocation"],
    timezoneId: "Asia/Makassar",
  },
  webServer: { command: "npm run db:fresh && npm run start -- -p 3100", url: "http://localhost:3100", reuseExistingServer: true, timeout: 120_000 },
});
