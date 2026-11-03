/* Kosongkan semua baris (tanpa drop skema) lalu seed ulang. Dipakai sebelum tes API/e2e agar hasil deterministik. */
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
const db = new PrismaClient();
async function main() {
  await db.$transaction([
    db.notification.deleteMany(), db.registration.deleteMany(), db.qrMap.deleteMany(), db.pin.deleteMany(), db.eventFacility.deleteMany(),
    db.event.deleteMany(), db.organizer.deleteMany(), db.session.deleteMany(), db.user.deleteMany(), db.place.deleteMany(), db.campus.deleteMany(),
  ]);
  await db.$disconnect();
  execSync("tsx prisma/seed.ts", { stdio: "inherit" });
}
main();
