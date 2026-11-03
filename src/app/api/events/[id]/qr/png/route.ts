import QRCode from "qrcode";
import { route } from "@/server/http";
import { requireUser } from "@/server/auth";
import { ownedEvent } from "@/server/rules";
import { baseUrl, ensureQr } from "@/server/qr";

export const GET = route<{ id: string }>(async (req, { id }) => {
  const u = await requireUser();
  const ev = await ownedEvent(id, u);
  const qr = await ensureQr(id, ev.placeId);
  const png = await QRCode.toBuffer(`${baseUrl(req)}/q/${qr.code}`, { width: 768, margin: 2 });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="qr-${id}.png"` } });
});
