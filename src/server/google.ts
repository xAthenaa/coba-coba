/** Google OAuth 2.0 (authorization code flow) tanpa library. URL endpoint bisa di-override env untuk tes (mock). */
export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const G = {
  auth: () => process.env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth",
  token: () => process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token",
  userinfo: () => process.env.GOOGLE_USERINFO_URL || "https://openidconnect.googleapis.com/v1/userinfo",
};
export const OAUTH_COOKIE = "wayo_oauth";
export function redirectUri(req: Request) {
  return process.env.GOOGLE_REDIRECT_URI || `${(process.env.BASE_URL || new URL(req.url).origin).replace(/\/$/, "")}/api/auth/google/callback`;
}
export type OAuthState = { state: string; mode: "login" | "daftar"; role: "VISITOR" | "ORGANIZER" | null; next: string | null };
export const encodeState = (s: OAuthState) => Buffer.from(JSON.stringify(s)).toString("base64url");
export function decodeState(v?: string): OAuthState | null {
  if (!v) return null;
  try { const s = JSON.parse(Buffer.from(v, "base64url").toString()); return typeof s?.state === "string" ? s : null; } catch { return null; }
}
export type GoogleProfile = { sub: string; email: string; email_verified?: boolean | string; name?: string; picture?: string };
export async function exchangeCode(code: string, req: Request): Promise<GoogleProfile> {
  const res = await fetch(G.token(), {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, cache: "no-store", signal: AbortSignal.timeout(8000),
    body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri(req), grant_type: "authorization_code" }),
  });
  const tok = await res.json().catch(() => null);
  if (!res.ok || !tok?.access_token) throw new Error(`token exchange gagal (${res.status})`);
  const ui = await fetch(G.userinfo(), { headers: { authorization: `Bearer ${tok.access_token}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  const p = await ui.json().catch(() => null);
  if (!ui.ok || !p?.sub || !p?.email) throw new Error(`userinfo gagal (${ui.status})`);
  return p as GoogleProfile;
}
export const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/api") ? n : null);
