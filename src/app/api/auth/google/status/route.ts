import { ok, route } from "@/server/http";
import { googleConfigured } from "@/server/google";
/** Apakah login Google sudah dikonfigurasi (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET). */
export const GET = route(async () => ok({ configured: googleConfigured() }));
