import { randomBytes } from "node:crypto";
import { db } from "./db";
export const qrCode = () => randomBytes(9).toString("base64url");
export const baseUrl = (req: Request) => (process.env.BASE_URL || new URL(req.url).origin).replace(/\/$/, "");
export async function ensureQr(eventId: string, placeId: string) {
  return (await db.qrMap.findUnique({ where: { eventId } })) ?? db.qrMap.create({ data: { eventId, targetPlaceId: placeId, code: qrCode() } });
}
