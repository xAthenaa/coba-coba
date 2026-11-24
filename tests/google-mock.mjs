/**
 * Mock server OAuth Google untuk tes (tanpa internet). Jalankan server WAYO dengan:
 *   GOOGLE_CLIENT_ID=test GOOGLE_CLIENT_SECRET=test GOOGLE_AUTH_URL=http://localhost:3918/auth
 *   GOOGLE_TOKEN_URL=http://localhost:3918/token GOOGLE_USERINFO_URL=http://localhost:3918/userinfo
 * Profil yang "login" diatur lewat setProfile() (in-process) atau POST /__profile (JSON).
 */
import http from "node:http";
import { randomBytes } from "node:crypto";

export function startGoogleMock(port = Number(process.env.GOOGLE_MOCK_PORT || 3918)) {
  let profile = { sub: "g-default", email: "google-default@contoh.id", email_verified: true, name: "Google Default" };
  const codes = new Map(), tokens = new Map();
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://localhost:${port}`);
    let body = ""; for await (const c of req) body += c;
    if (u.pathname === "/__profile" && req.method === "POST") { profile = JSON.parse(body); res.end("ok"); return; }
    if (u.pathname === "/auth") {
      const code = randomBytes(8).toString("hex"); codes.set(code, profile);
      const back = new URL(u.searchParams.get("redirect_uri"));
      back.searchParams.set("code", code); back.searchParams.set("state", u.searchParams.get("state") ?? "");
      res.writeHead(302, { location: back.toString() }); res.end(); return;
    }
    if (u.pathname === "/token" && req.method === "POST") {
      const f = new URLSearchParams(body);
      const p = codes.get(f.get("code"));
      if (!p || f.get("client_secret") !== process.env.GOOGLE_MOCK_SECRET && f.get("client_secret") !== "test") { res.writeHead(400, { "content-type": "application/json" }); res.end('{"error":"invalid_grant"}'); return; }
      codes.delete(f.get("code"));
      const t = randomBytes(8).toString("hex"); tokens.set(t, p);
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ access_token: t, token_type: "Bearer", expires_in: 3600 })); return;
    }
    if (u.pathname === "/userinfo") {
      const p = tokens.get((req.headers.authorization ?? "").replace(/^Bearer /, ""));
      res.writeHead(p ? 200 : 401, { "content-type": "application/json" }); res.end(JSON.stringify(p ?? { error: "invalid_token" })); return;
    }
    res.writeHead(404); res.end();
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve({ setProfile: (p) => { profile = p; }, close: () => new Promise((r) => server.close(r)) }));
  });
}
