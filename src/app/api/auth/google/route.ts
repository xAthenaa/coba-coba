import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { G, OAUTH_COOKIE, encodeState, googleConfigured, redirectUri, safeNext } from "@/server/google";
import { ROLES, asEnum } from "@/server/validate";

/** Mulai OAuth Google. ?mode=login|daftar &role=VISITOR|ORGANIZER (wajib untuk daftar) &next=/path */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const mode = sp.get("mode") === "daftar" ? "daftar" : "login";
  const back = mode === "daftar" ? "/daftar" : "/login";
  if (!googleConfigured()) return NextResponse.redirect(new URL(`${back}?google=off`, req.url));
  const role = asEnum(sp.get("role"), ROLES);
  if (mode === "daftar" && !role) return NextResponse.redirect(new URL("/daftar?google=peran", req.url));
  const state = randomBytes(16).toString("hex");
  const url = new URL(G.auth());
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(req), response_type: "code", scope: "openid email profile",
    state, prompt: "select_account", access_type: "online",
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, encodeState({ state, mode, role, next: safeNext(sp.get("next")) }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/auth/google", maxAge: 600,
  });
  return res;
}
