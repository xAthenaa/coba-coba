/**
 * Tes API WAYO — test-plan-api.md A–G. Node >= 18 (fetch bawaan), tanpa dependensi tes.
 * Jalankan: npm run db:fresh && npm run build && npm start   lalu   WAYO_URL=http://localhost:3000 node tests/api.mjs
 * Cek DB (hash bcrypt, jumlah seed) memakai @prisma/client milik proyek. WAYO_SKIP_DB=1 untuk melewatinya.
 */
import { execSync } from "node:child_process";

const BASE = (process.env.WAYO_URL || "http://localhost:3000").replace(/\/$/, "");
let pass = 0, fail = 0;
const fails = [];
const section = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`);
function check(name, cond, info) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; fails.push(name); console.log(`  ✗ ${name}${info !== undefined ? "  → " + JSON.stringify(info).slice(0, 300) : ""}`); }
}

class Client {
  constructor(name) { this.name = name; this.cookies = {}; }
  get cookieHeader() { return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; "); }
  async req(method, path, body, { raw } = {}) {
    const headers = {};
    if (this.cookieHeader) headers.cookie = this.cookieHeader;
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : raw ? body : JSON.stringify(body), redirect: "manual" });
    const setc = res.headers.getSetCookie?.() ?? [];
    for (const c of setc) {
      const [kv] = c.split(";"); const i = kv.indexOf("=");
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      if (!v || /max-age=0/i.test(c)) delete this.cookies[k]; else this.cookies[k] = v;
    }
    const text = res.headers.get("content-type")?.includes("json") ? await res.text() : null;
    let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
    return { status: res.status, json, data: json?.data, error: json?.error, headers: res.headers, setCookie: setc, text };
  }
  get(p) { return this.req("GET", p); } post(p, b) { return this.req("POST", p, b); }
  patch(p, b) { return this.req("PATCH", p, b); } del(p) { return this.req("DELETE", p); }
  async login(email, password = "demo123") { return this.post("/api/auth/login", { email, password }); }
}

const uniq = Date.now().toString(36);
const iso = (h) => new Date(Date.now() + h * 3600e3).toISOString();
const anon = new Client("anon"), vis = new Client("visitor"), own = new Client("owner"), other = new Client("other");

async function db() {
  if (process.env.WAYO_SKIP_DB) return null;
  try { const { PrismaClient } = await import("@prisma/client"); return new PrismaClient(); } catch { return null; }
}

async function main() {
  const prisma = await db();
  // ---------- G-00 / G-03 seed ----------
  section("G. Seed");
  if (prisma) {
    const count = async () => ({ e: await prisma.event.count({ where: { id: { in: ["ev-webinar", "ev-invention", "ev-pkkmb"] } } }), o: await prisma.organizer.count({ where: { id: { in: ["org-ft", "org-hmif", "org-bem"] } } }), p: await prisma.place.count(), pin: await prisma.pin.count({ where: { id: { startsWith: "pin-" } } }), u: await prisma.user.count({ where: { id: { in: ["u-pengunjung", "u-panitia"] } } }), qr: await prisma.qrMap.count({ where: { eventId: { in: ["ev-webinar", "ev-invention", "ev-pkkmb"] } } }) });
    const before = await count();
    check("G-03 jumlah seed = isi JSON (3 event, 3 org, 23 tempat, 5 pin, 2 user JSON, 3 QR)", before.e === 3 && before.o === 3 && before.p === 23 && before.pin === 5 && before.u === 2 && before.qr === 3, before);
    if (!process.env.WAYO_SKIP_RESEED) {
      const totals = async () => [await prisma.user.count(), await prisma.place.count(), await prisma.event.count(), await prisma.pin.count(), await prisma.registration.count(), await prisma.notification.count(), await prisma.qrMap.count()].join(",");
      const t0 = await totals();
      execSync("npx tsx prisma/seed.ts", { stdio: "ignore" });
      check("G-00 seed 2x tidak menggandakan data", (await totals()) === t0, { t0, t1: await totals() });
    }
    check("G-00 ID JSON tetap", !!(await prisma.event.findUnique({ where: { id: "ev-invention" } })) && !!(await prisma.place.findUnique({ where: { id: "pl-fmipa" } })));
  } else console.log("  (lewati cek DB)");

  // ---------- A. Auth ----------
  section("A. Auth");
  const email = `uji-${uniq}@contoh.id`;
  const newUser = new Client("new");
  let r = await newUser.post("/api/auth/register", { name: "Uji Coba", email, password: "rahasia123" });
  check("A-01 register valid -> 201", r.status === 201, r.json);
  check("A-01 password/hash tidak dikembalikan", r.text && !/password|\$2[aby]\$/i.test(r.text));
  check("A-01 register langsung membuat sesi (cookie)", !!newUser.cookies.wayo_session);
  if (prisma) {
    const u = await prisma.user.findUnique({ where: { email } });
    check("A-01 tersimpan sebagai hash bcrypt ($2…)", u?.passwordHash.startsWith("$2") && u.passwordHash !== "rahasia123");
    const s = await prisma.session.findFirst({ where: { userId: u.id } });
    check("A-01 DB menyimpan SHA-256 token, bukan token mentah", s && s.tokenHash.length === 64 && s.tokenHash !== newUser.cookies.wayo_session);
  }
  r = await anon.post("/api/auth/register", { name: "X", email, password: "rahasia123" });
  check("A-02 email dobel -> 409", r.status === 409, r.json);
  r = await anon.post("/api/auth/register", { name: "X", email: "bukan-email", password: "rahasia123" });
  check("A-02 email tidak valid -> 400 VALIDATION fields.email", r.status === 400 && r.error?.code === "VALIDATION" && r.error.fields?.email, r.json);
  r = await anon.post("/api/auth/register", { name: "X", email: `p-${uniq}@contoh.id`, password: "" });
  check("A-02 password kosong -> 400", r.status === 400 && r.error?.fields?.password, r.json);
  r = await anon.post("/api/auth/register", { name: "X", email: `p-${uniq}@contoh.id`, password: "pendek" });
  check("A-02 password < 8 -> 400", r.status === 400 && r.error?.fields?.password, r.json);
  r = await anon.post("/api/auth/register", { name: "X", email: `p-${uniq}@contoh.id`, password: "rahasia123", role: "ADMIN" });
  check("A-02 role asing -> 400", r.status === 400 && r.error?.fields?.role, r.json);

  r = await vis.login("pengunjung@contoh.id");
  check("A-03 login benar -> 200", r.status === 200 && r.data?.role === "VISITOR", r.json);
  const sc = r.setCookie.find((c) => c.startsWith("wayo_session=")) || "";
  check("A-03 cookie HttpOnly; SameSite=Lax; Path=/; Max-Age 7 hari", /httponly/i.test(sc) && /samesite=lax/i.test(sc) && /path=\//i.test(sc) && /max-age=604800/i.test(sc), sc);
  check("A-03 token 32 byte (64 hex)", /^[0-9a-f]{64}$/.test(vis.cookies.wayo_session || ""));
  await own.login("panitia@contoh.id");
  const r1 = await anon.login("pengunjung@contoh.id", "salahsalah");
  const r2 = await anon.login(`takada-${uniq}@contoh.id`, "salahsalah");
  check("A-04 password salah -> 401", r1.status === 401, r1.json);
  check("A-04 email tak dikenal -> 401 pesan sama", r2.status === 401 && r1.error?.message === r2.error?.message, [r1.json, r2.json]);
  r = await vis.get("/api/me");
  check("A-05 GET /me dengan cookie -> 200 tanpa hash", r.status === 200 && r.data.email === "pengunjung@contoh.id" && !("passwordHash" in r.data), r.json);
  check("A-05 GET /me tanpa cookie -> 401", (await anon.get("/api/me")).status === 401);
  const oldCookie = newUser.cookies.wayo_session;
  r = await newUser.post("/api/auth/logout");
  check("A-06 logout -> 204 + cookie dihapus", r.status === 204 && !newUser.cookies.wayo_session && r.setCookie.some((c) => c.startsWith("wayo_session=;") || /max-age=0/i.test(c)), r.setCookie);
  const replay = new Client("replay"); replay.cookies.wayo_session = oldCookie;
  check("A-06 sesi lama tidak bisa dipakai lagi -> 401", (await replay.get("/api/me")).status === 401);
  const forged = new Client("forged"); forged.cookies.wayo_session = "0".repeat(64);
  check("A-07 cookie dimanipulasi -> 401", (await forged.get("/api/me")).status === 401);
  if (prisma) {
    const exp = new Client("exp"); await exp.login(email, "rahasia123");
    await prisma.session.updateMany({ where: { user: { email } }, data: { expiresAt: new Date(Date.now() - 1000) } });
    check("A-07 sesi kedaluwarsa -> 401", (await exp.get("/api/me")).status === 401);
  }
  r = await vis.patch("/api/me", { role: "ORGANIZER", name: "Pengunjung Demo" });
  check("A-08 role di PATCH /me diabaikan", r.status === 200 && r.data.role === "VISITOR", r.json);
  r = await vis.patch("/api/me", { name: "Pengunjung Demo", phone: "081234567890", faculty: "FMIPA" });
  check("A-09 update profil -> 200 tersimpan", r.status === 200 && r.data.phone === "081234567890" && (await vis.get("/api/me")).data.faculty === "FMIPA", r.json);
  r = await vis.patch("/api/me", { email: "panitia@contoh.id" });
  check("A-09 email bentrok -> 409", r.status === 409, r.json);
  r = await vis.patch("/api/me", { name: "" });
  check("A-09 nama kosong -> 400", r.status === 400 && r.error.fields?.name, r.json);
  r = await anon.post("/api/auth/forgot", { email: `takada-${uniq}@contoh.id` });
  check("A lupa password selalu 200", r.status === 200 && (await anon.post("/api/auth/forgot", { email: "pengunjung@contoh.id" })).status === 200);

  // organizer kedua (panitia lain)
  r = await other.post("/api/auth/register", { name: "Panitia Lain", email: `org-${uniq}@contoh.id`, password: "rahasia123", role: "ORGANIZER", organizerName: `Himpunan Uji ${uniq}` });
  check("A register ORGANIZER -> 201 + organizer dibuat otomatis", r.status === 201 && r.data.role === "ORGANIZER" && !!r.data.organizerId, r.json);
  const otherOrgId = r.data?.organizerId;

  // ---------- B. Akses ----------
  section("B. Akses per peran");
  check("B GET /api/campuses publik -> 200", (await anon.get("/api/campuses")).status === 200);
  for (const p of ["/api/events", "/api/events/ev-invention", "/api/places", "/api/places/x", "/api/pins", "/api/organizers", "/api/organizers/org-ft", "/api/notifications", "/api/me/registrations", "/api/qr/abc", "/api/events/ev-invention/pins", "/api/events/ev-invention/qr"])
    check(`B tanpa login GET ${p} -> 401`, (await anon.get(p)).status === 401);
  // matriks tulis
  const evBody = (o = {}) => ({ name: `Event Uji ${uniq}`, description: "d", faculty: "Teknik", placeId: "pl-fmipa", startAt: iso(24), endAt: iso(27), speakers: ["A"], facilities: [], ...o });
  const places = (await vis.get("/api/places")).data;
  const placeId = places[0].id;
  const matrix = [
    ["POST /api/events", (c) => c.post("/api/events", evBody({ placeId })), [401, 403, 201, 201]],
    ["PATCH /api/events/ev-invention", (c) => c.patch("/api/events/ev-invention", { description: "Diperbarui" }), [401, 403, 200, 403]],
    ["POST /api/events/ev-invention/pins", (c) => c.post("/api/events/ev-invention/pins", { label: "Pin uji", category: "INFO", lat: -8.6765, lng: 115.226, type: "PERMANENT" }), [401, 403, 201, 403]],
    ["GET /api/events/ev-invention/qr", (c) => c.get("/api/events/ev-invention/qr"), [401, 403, 200, 403]],
    ["POST /api/events/ev-invention/qr/regenerate", (c) => c.post("/api/events/ev-invention/qr/regenerate"), [401, 403, 201, 403]],
    ["PATCH /api/organizers/me", (c) => c.patch("/api/organizers/me", { contact: "@uji" }), [401, 403, 200, 200]],
    ["PATCH /api/pins/pin-stand-kopi", (c) => c.patch("/api/pins/pin-stand-kopi", { label: "Stand Kopi" }), [401, 403, 200, 403]],
  ];
  const created = [];
  for (const [name, fn, exp] of matrix) {
    const got = [];
    for (const c of [anon, vis, own, other]) { const x = await fn(c); got.push(x.status); if (x.status === 201 && x.data?.id) created.push([name, c, x.data.id]); }
    check(`B ${name}: anon/pengunjung/pemilik/panitia lain = ${exp.join("/")}`, got.join() === exp.join(), got);
  }
  check("B 401 dicek sebelum 404 (anon ke event tak ada)", (await anon.patch("/api/events/tidak-ada", {})).status === 401);
  check("B pengunjung tidak bisa daftar sebagai organizer di POST register event (403 untuk panitia)", (await own.post("/api/events/ev-webinar/register")).status === 403);
  // IDOR notifikasi
  const vn = (await vis.get("/api/notifications")).data;
  r = await other.post(`/api/notifications/${vn.items[0].id}/read`);
  check("B IDOR: user lain tidak bisa menandai notifikasi orang lain (404)", r.status === 404, r.json);
  check("B IDOR: list notifikasi panitia lain tidak berisi milik pengunjung", !(await other.get("/api/notifications")).data.items.some((n) => vn.items.some((m) => m.id === n.id)));
  check("B IDOR: registrasi user lain tidak terlihat", (await other.get("/api/me/registrations")).data.length === 0);

  // ---------- C. Event ----------
  section("C. Event");
  r = await vis.get("/api/events");
  check("C-01 list event -> 200 (≥3)", r.status === 200 && r.data.length >= 3);
  const st = Object.fromEntries(r.data.filter((e) => e.id.startsWith("ev-")).map((e) => [e.id, e.status]));
  const now = Date.now();
  const expect = (s, e) => (now >= Date.parse(e) ? "ENDED" : now >= Date.parse(s) ? "ONGOING" : "UPCOMING");
  check("C-01 status sesuai tanggal seed", st["ev-pkkmb"] === expect("2026-06-10T08:00:00+08:00", "2026-06-11T17:00:00+08:00") && st["ev-webinar"] === expect("2026-11-10T08:00:00+08:00", "2026-11-10T15:00:00+08:00") && st["ev-invention"] === expect("2026-11-03T09:00:00+08:00", "2026-11-05T17:00:00+08:00"), st);
  for (const s of ["aktif", "akan-datang", "selesai"]) {
    const x = await vis.get(`/api/events?status=${s}`);
    const want = { aktif: "ONGOING", "akan-datang": "UPCOMING", selesai: "ENDED" }[s];
    check(`C-01 filter status=${s}`, x.status === 200 && x.data.every((e) => e.status === want), x.data?.map((e) => e.status));
  }
  check("C-01 filter status asing -> 400", (await vis.get("/api/events?status=kemarin")).status === 400);
  r = await vis.get("/api/events/ev-invention");
  check("C-02 detail event -> 200 + place/organizer/facilities", r.status === 200 && r.data.place?.id && r.data.organizer?.id === "org-ft" && Array.isArray(r.data.facilities));
  check("C-02 id tak ada -> 404", (await vis.get("/api/events/tidak-ada")).status === 404);
  r = await own.post("/api/events", evBody({ placeId }));
  check("C-03 buat event -> 201", r.status === 201, r.json);
  const newEv = r.data;
  check("C-03 muncul di list", (await vis.get("/api/events")).data.some((e) => e.id === newEv.id));
  check("C-03 muncul di organizer-nya", (await vis.get("/api/organizers/org-ft")).data.events.some((e) => e.id === newEv.id));
  check("C-03 QrMap otomatis dibuat", (await own.get(`/api/events/${newEv.id}/qr`)).data?.code?.length > 5);
  check("C-03 ?mine=1 hanya event sendiri", (await own.get("/api/events?mine=1")).data.every((e) => e.organizerId === "org-ft"));
  r = await own.post("/api/events", evBody({ name: "" }));
  check("C-04 nama kosong -> 400 fields.name", r.status === 400 && r.error.fields?.name, r.json);
  r = await own.post("/api/events", evBody({ startAt: iso(5), endAt: iso(4) }));
  check("C-04 selesai < mulai -> 400 fields.endAt", r.status === 400 && r.error.fields?.endAt, r.json);
  r = await own.post("/api/events", evBody({ placeId: "tidak-ada" }));
  check("C-04 lokasi tak ada -> 400 fields.placeId", r.status === 400 && r.error.fields?.placeId, r.json);
  r = await own.post("/api/events", evBody({ facilities: ["tidak-ada"] }));
  check("C-04 fasilitas tak ada -> 400", r.status === 400 && r.error.fields?.facilities, r.json);
  r = await own.patch(`/api/events/${newEv.id}`, { name: "Event Uji Diubah" });
  check("C-05 edit milik sendiri -> 200", r.status === 200 && r.data.name === "Event Uji Diubah", r.json);
  check("C-05 edit milik org lain -> 403", (await other.patch(`/api/events/${newEv.id}`, { name: "X" })).status === 403);
  check("C-05 edit event tak ada -> 404", (await own.patch("/api/events/tidak-ada", { name: "X" })).status === 404);
  // registrasi
  r = await vis.post(`/api/events/${newEv.id}/register`);
  check("C-07 pengunjung daftar -> 201", r.status === 201, r.json);
  check("C-07 daftar dobel -> 409", (await vis.post(`/api/events/${newEv.id}/register`)).status === 409);
  check("C-07 event selesai -> 400", (await vis.post("/api/events/ev-pkkmb/register")).status === 400);
  check("C-07 daftar event tak ada -> 404", (await vis.post("/api/events/tidak-ada/register")).status === 404);
  const reg = await vis.get("/api/me/registrations?tab=terdaftar");
  check("C-07 tab terdaftar berisi event baru", reg.data.some((e) => e.id === newEv.id));
  check("C-07 tab terlewati berisi ev-pkkmb", (await vis.get("/api/me/registrations?tab=terlewati")).data.some((e) => e.id === "ev-pkkmb"));
  await own.patch(`/api/events/${newEv.id}`, { description: "Info baru" });
  check("C PATCH event -> notifikasi EVENT_UPDATED ke pendaftar", (await vis.get("/api/notifications")).data.items.some((n) => n.type === "EVENT_UPDATED" && n.eventId === newEv.id));
  check("C-07 batal daftar -> 204", (await vis.del(`/api/events/${newEv.id}/register`)).status === 204);
  check("C-07 batal lagi -> 404", (await vis.del(`/api/events/${newEv.id}/register`)).status === 404);
  await vis.post(`/api/events/${newEv.id}/register`);
  const p1 = (await own.post(`/api/events/${newEv.id}/pins`, { label: "Tmp", category: "INFO", lat: -8.67, lng: 115.22, type: "PERMANENT" })).data;
  const qrOld = (await own.get(`/api/events/${newEv.id}/qr`)).data.code;
  check("C-06 hapus event milik org lain -> 403", (await other.del(`/api/events/${newEv.id}`)).status === 403);
  check("C-06 hapus event -> 204", (await own.del(`/api/events/${newEv.id}`)).status === 204);
  check("C-06 event terhapus -> 404", (await vis.get(`/api/events/${newEv.id}`)).status === 404);
  check("C-06 pin ikut terhapus", (await own.get(`/api/pins/${p1.id}`)).status === 404);
  check("E-03 QR event dihapus -> 404", (await vis.get(`/api/qr/${qrOld}`)).status === 404);
  if (prisma) check("C-06 registrasi & QR tidak yatim", (await prisma.registration.count({ where: { eventId: newEv.id } })) === 0 && (await prisma.qrMap.count({ where: { eventId: newEv.id } })) === 0);

  // ---------- D. Pin ----------
  section("D. Pin");
  const pinBase = { label: "Pos Uji", category: "STAND", lat: -8.6762, lng: 115.2258 };
  r = await own.post("/api/events/ev-invention/pins", { ...pinBase, type: "TIMED", startAt: iso(-1), endAt: iso(2) });
  check("D-01 pin TIMED -> 201", r.status === 201 && r.data.status === "ACTIVE", r.json);
  const timedPin = r.data;
  r = await own.post("/api/events/ev-invention/pins", { ...pinBase, type: "PERMANENT" });
  check("D-01 pin PERMANENT -> 201", r.status === 201 && r.data.startAt === null, r.json);
  const permPin = r.data;
  r = await own.post("/api/events/ev-invention/pins", { ...pinBase, type: "TIMED" });
  check("D-02 TIMED tanpa tanggal -> 400 'Wajib diisi untuk pin berbasis waktu'", r.status === 400 && r.error.fields?.startAt === "Wajib diisi untuk pin berbasis waktu", r.json);
  r = await own.post("/api/events/ev-invention/pins", { ...pinBase, type: "TIMED", startAt: iso(2), endAt: iso(1) });
  check("D-02 end <= start -> 400 fields.endAt", r.status === 400 && r.error.fields?.endAt === "Waktu hapus harus setelah waktu pasang", r.json);
  r = await own.post("/api/events/ev-invention/pins", { ...pinBase, type: "PERMANENT", startAt: iso(1), endAt: iso(2) });
  check("D-02 PERMANENT dengan tanggal -> 400", r.status === 400 && Object.values(r.error.fields || {}).includes("Pin permanen tidak boleh punya rentang waktu"), r.json);
  r = await own.patch(`/api/pins/${timedPin.id}`, { type: "PERMANENT" });
  check("D-02 TIMED→PERMANENT tanpa null eksplisit -> 400", r.status === 400, r.json);
  r = await own.patch(`/api/pins/${timedPin.id}`, { type: "PERMANENT", startAt: null, endAt: null });
  check("D-02 TIMED→PERMANENT dengan null -> 200", r.status === 200 && r.data.type === "PERMANENT", r.json);
  const past = (await own.post("/api/events/ev-invention/pins", { ...pinBase, label: "Lewat", type: "TIMED", startAt: iso(-5), endAt: iso(-1) })).data;
  const future = (await own.post("/api/events/ev-invention/pins", { ...pinBase, label: "Nanti", type: "TIMED", startAt: iso(5), endAt: iso(8) })).data;
  const pub = (await vis.get("/api/pins")).data.map((p) => p.id);
  check("D-03 pin lewat tidak di list publik", !pub.includes(past.id));
  check("D-03 pin belum mulai tidak di list publik", !pub.includes(future.id));
  check("D-03 pin aktif ada di list publik", pub.includes(permPin.id));
  check("D-03 list pin event (pengunjung) tanpa terjadwal/kedaluwarsa", !(await vis.get("/api/events/ev-invention/pins")).data.some((p) => [past.id, future.id].includes(p.id)));
  const ownerList = (await own.get("/api/events/ev-invention/pins")).data;
  check("D-03 pemilik tetap melihat semua (+status)", ownerList.find((p) => p.id === past.id)?.status === "EXPIRED" && ownerList.find((p) => p.id === future.id)?.status === "SCHEDULED");
  check("D-03 GET pin kedaluwarsa oleh pengunjung -> 404", (await vis.get(`/api/pins/${past.id}`)).status === 404);
  check("D-03 GET pin terjadwal oleh pengunjung -> 404", (await vis.get(`/api/pins/${future.id}`)).status === 404);
  check("D-03 GET pin terjadwal oleh pemilik -> 200", (await own.get(`/api/pins/${future.id}`)).status === 200);
  for (const c of ["GEDUNG", "EVENT", "KANTIN", "TOILET", "PARKIR", "INFO", "STAND"]) {
    const x = await own.post("/api/events/ev-invention/pins", { ...pinBase, category: c, type: "PERMANENT" });
    check(`D-04 kategori ${c} diterima`, x.status === 201, x.json);
    if (x.data) await own.del(`/api/pins/${x.data.id}`);
  }
  check("D-04 filter ?category=stand", (await vis.get("/api/pins?category=stand")).data.every((p) => p.category === "STAND"));
  check("D-04 kategori asing (filter) -> 400", (await vis.get("/api/pins?category=ruang")).status === 400);
  check("D-04 kategori asing (buat) -> 400", (await own.post("/api/events/ev-invention/pins", { ...pinBase, category: "KOLAM", type: "PERMANENT" })).status === 400);
  check("D-05 lat > 90 -> 400", (await own.post("/api/events/ev-invention/pins", { ...pinBase, lat: 91, type: "PERMANENT" })).error?.fields?.lat);
  check("D-05 lng > 180 -> 400", (await own.post("/api/events/ev-invention/pins", { ...pinBase, lng: 181, type: "PERMANENT" })).error?.fields?.lng);
  check("D-05 lat bukan angka -> 400", (await own.post("/api/events/ev-invention/pins", { ...pinBase, lat: "abc", type: "PERMANENT" })).error?.fields?.lat);
  check("D-06 edit pin oleh panitia lain -> 403", (await other.patch(`/api/pins/${permPin.id}`, { label: "X" })).status === 403);
  check("D-06 edit pin oleh pengunjung -> 403", (await vis.patch(`/api/pins/${permPin.id}`, { label: "X" })).status === 403);
  check("D-06 hapus pin oleh panitia lain -> 403", (await other.del(`/api/pins/${permPin.id}`)).status === 403);
  check("D-06 hapus pin oleh pengunjung -> 403", (await vis.del(`/api/pins/${permPin.id}`)).status === 403);
  check("D-06 edit pin pemilik -> 200", (await own.patch(`/api/pins/${permPin.id}`, { label: "Pos Uji 2" })).data?.label === "Pos Uji 2");
  check("D-06 hapus pin pemilik -> 204", (await own.del(`/api/pins/${permPin.id}`)).status === 204);
  check("D-06 hapus pin tak ada -> 404", (await own.del(`/api/pins/${permPin.id}`)).status === 404);
  // ---------- D-07 hapus pin: urutan 401 → 403 → 404, sukses 204 ----------
  const dp = (await own.post("/api/events/ev-invention/pins", { ...pinBase, label: `Hapus ${uniq}`, type: "PERMANENT" })).data;
  check("D-07 tambah pin (POST) -> 201 + muncul di list", !!dp?.id && (await own.get("/api/events/ev-invention/pins")).data.some((p) => p.id === dp.id), dp);
  check("D-07 hapus pin tanpa login -> 401", (await anon.del(`/api/pins/${dp.id}`)).status === 401);
  check("D-07 hapus pin oleh pengunjung -> 403", (await vis.del(`/api/pins/${dp.id}`)).status === 403);
  check("D-07 hapus pin oleh panitia lain -> 403", (await other.del(`/api/pins/${dp.id}`)).status === 403);
  check("D-07 hapus pin tak ada tanpa login -> 401", (await anon.del("/api/pins/tidak-ada")).status === 401);
  check("D-07 hapus pin tak ada oleh pengunjung -> 403", (await vis.del("/api/pins/tidak-ada")).status === 403);
  check("D-07 hapus pin tak ada oleh panitia -> 404", (await own.del("/api/pins/tidak-ada")).status === 404);
  const dr = await own.del(`/api/pins/${dp.id}`);
  check("D-07 hapus pin pemilik -> 204 tanpa body", dr.status === 204 && !dr.text, dr.status);
  check("D-07 pin terhapus hilang dari list event", !(await own.get("/api/events/ev-invention/pins")).data.some((p) => p.id === dp.id));
  check("D-07 pin terhapus hilang dari /api/pins", !(await vis.get("/api/pins")).data.some((p) => p.id === dp.id));
  check("D-07 GET pin terhapus -> 404", (await own.get(`/api/pins/${dp.id}`)).status === 404);
  // ---------- H Jimbaran ----------
  const jb = (await vis.get("/api/places?campusId=jimbaran")).data ?? [];
  check("H-01 Kampus Jimbaran punya >= 10 tempat", jb.length >= 10 && jb.every((p) => p.campusId === "jimbaran" && Math.abs(p.lat + 8.798) < 0.01 && Math.abs(p.lng - 115.17) < 0.01), jb.length);
  // Event uji yang sedang berlangsung (data contoh ev-invention berakhir 5 Nov 2026, jadi tidak bisa dipakai untuk daftar/QR aktif).
  const liveEv = (await own.post("/api/events", evBody({ name: `Berlangsung ${uniq}`, startAt: iso(-1), endAt: iso(48) }))).data;
  // PIN_NEW: daftarkan pengunjung ke event berlangsung lalu buat pin
  await vis.post(`/api/events/${liveEv.id}/register`);
  const pn = (await own.post(`/api/events/${liveEv.id}/pins`, { ...pinBase, label: "Pin Notif", type: "PERMANENT" })).data;
  check("D POST pin -> PIN_NEW ke pendaftar", (await vis.get("/api/notifications")).data.items.some((n) => n.type === "PIN_NEW" && n.pinId === pn.id));
  for (const p of [timedPin, past, future, pn]) await own.del(`/api/pins/${p.id}`);
  await vis.del(`/api/events/${liveEv.id}/register`);

  // ---------- E. QR ----------
  section("E. QR");
  r = await own.get(`/api/events/${liveEv.id}/qr`);
  check("E-01 GET QR milik sendiri -> 200 {code,url}", r.status === 200 && r.data.url.endsWith(`/q/${r.data.code}`), r.json);
  const c0 = r.data.code;
  r = await own.post(`/api/events/${liveEv.id}/qr/regenerate`);
  check("E-01 regenerate -> 201 token baru unik", r.status === 201 && r.data.code !== c0, r.json);
  const c1 = r.data.code;
  check("E-01 QR event org lain -> 403", (await own.get("/api/events/ev-webinar/qr")).status === 403);
  r = await vis.get(`/api/qr/${c1}`);
  check("E-02 resolve QR valid -> 200 {eventId,placeId,lat,lng,campusId}", r.status === 200 && r.data.eventId === liveEv.id && r.data.placeId && typeof r.data.lat === "number" && r.data.campusId === "sudirman", r.json);
  check("E-02 resolve tanpa login -> 401", (await anon.get(`/api/qr/${c1}`)).status === 401);
  r = await vis.get(`/api/qr/${c0}`);
  check("E-03 code lama setelah regenerate -> 404 'QR tidak valid'", r.status === 404 && r.error.message === "QR tidak valid", r.json);
  check("E-03 token tak dikenal -> 404", (await vis.get("/api/qr/ngawur123")).status === 404);
  if (prisma) {
    const q = await prisma.qrMap.findUnique({ where: { eventId: "ev-pkkmb" } });
    check("E-03 QR event selesai -> 404", (await vis.get(`/api/qr/${q.code}`)).status === 404);
    check("E-03 QR menyimpan id tempat tujuan", !!q.targetPlaceId);
  }
  const png = await fetch(`${BASE}/api/events/ev-invention/qr/png`, { headers: { cookie: own.cookieHeader } });
  const buf = Buffer.from(await png.arrayBuffer());
  check("E-04 unduh PNG -> 200 image/png", png.status === 200 && png.headers.get("content-type") === "image/png" && buf.subarray(1, 4).toString() === "PNG");
  check("E-04 PNG org lain -> 403", (await other.get("/api/events/ev-invention/qr/png")).status === 403);
  r = await anon.req("GET", `/q/${c1}`);
  check("E UI /q/[code] tanpa login -> redirect /login?next=", [307, 308].includes(r.status) && /\/login\?next=%2Fq%2F/.test(r.headers.get("location") || ""), r.headers.get("location"));

  await own.del(`/api/events/${liveEv.id}`);

  // ---------- F ----------
  section("F. Penyelenggara, Tempat, Notifikasi");
  r = await vis.get("/api/organizers");
  check("F-01 list penyelenggara + eventCount", r.status === 200 && r.data.find((o) => o.id === "org-ft")?.eventCount >= 1);
  check("F-01 cari ?q=", (await vis.get("/api/organizers?q=hmif")).data.every((o) => /hmif/i.test(o.name + o.faculty)));
  r = await vis.get("/api/organizers/org-hmif");
  check("F-01 detail + event miliknya", r.status === 200 && r.data.events.some((e) => e.id === "ev-webinar"));
  check("F-01 detail tak ada -> 404", (await vis.get("/api/organizers/tidak-ada")).status === 404);
  check("F-01 PATCH /organizers/me tersimpan", (await other.get(`/api/organizers/${otherOrgId}`)).data.contact === "@uji");
  const q1 = await vis.get(`/api/places?q=${encodeURIComponent(places[0].name.slice(0, 4).toUpperCase())}`);
  check("F-02 cari tempat case-insensitive", q1.status === 200 && q1.data.length >= 1);
  const q2 = await vis.get("/api/places?q=zzzzzz");
  check("F-02 hasil kosong -> 200 []", q2.status === 200 && Array.isArray(q2.data) && q2.data.length === 0);
  check("F-02 filter kategori", (await vis.get("/api/places?category=kantin")).data.every((p) => p.category === "KANTIN"));
  check("F-02 kategori asing -> 400", (await vis.get("/api/places?category=kolam")).status === 400);
  check("F-02 filter campusId=jimbaran -> hanya jimbaran", (await vis.get("/api/places?campusId=jimbaran")).data.every((p) => p.campusId === "jimbaran"));
  r = await vis.get("/api/places?lat=-8.6736&lng=115.2228");
  const ds = r.data.map((p) => p.distanceM);
  check("F-03 terdekat urut jarak + distanceM/walkMin", r.status === 200 && ds.every((d, i) => i === 0 || ds[i - 1] <= d) && r.data[0].walkMin === Math.ceil(r.data[0].distanceM / 1.3 / 60), r.data?.slice(0, 2));
  check("F-03 param lng hilang -> 400", (await vis.get("/api/places?lat=-8.67")).status === 400);
  check("F-03 sort=nearest tanpa lat/lng -> 400", (await vis.get("/api/places?sort=nearest")).status === 400);
  r = await vis.get("/api/notifications");
  check("F-04 notifikasi pengunjung + unreadCount", r.status === 200 && typeof r.data.unreadCount === "number" && r.data.items.length >= 3);
  const nid = r.data.items.find((n) => !n.read)?.id;
  r = await vis.post(`/api/notifications/${nid}/read`);
  check("F-04 tandai dibaca -> 200", r.status === 200);
  const before = (await vis.get("/api/notifications")).data;
  check("F-04 unreadCount berkurang", before.items.find((n) => n.id === nid).read === true);
  r = await vis.post("/api/notifications/read-all");
  check("F-04 read-all -> unreadCount 0", r.status === 200 && (await vis.get("/api/notifications")).data.unreadCount === 0);
  check("F-04 notif tak ada -> 404", (await vis.post("/api/notifications/tidak-ada/read")).status === 404);
  if (prisma) {
    // EVENT_START & PIN_EXPIRING dibuat malas saat GET
    const soonEv = (await own.post("/api/events", evBody({ name: "Segera", startAt: iso(0.5), endAt: iso(3) }))).data;
    await vis.post(`/api/events/${soonEv.id}/register`);
    const exp = (await own.post(`/api/events/${soonEv.id}/pins`, { ...pinBase, type: "TIMED", startAt: iso(-1), endAt: iso(0.2) })).data;
    const items = (await vis.get("/api/notifications")).data.items;
    check("F-04 EVENT_START dibuat otomatis", items.some((n) => n.type === "EVENT_START" && n.eventId === soonEv.id));
    check("F-04 PIN_EXPIRING dibuat otomatis", items.some((n) => n.type === "PIN_EXPIRING" && n.pinId === exp.id));
    const again = (await vis.get("/api/notifications")).data.items.filter((n) => n.type === "EVENT_START" && n.eventId === soonEv.id);
    check("F-04 tidak dobel saat GET ulang", again.length === 1);
    await own.del(`/api/events/${soonEv.id}`);
  }

  // ---------- G ----------
  section("G. Umum");
  for (const [m, p, c] of [["POST", "/api/auth/login", anon], ["POST", "/api/events", own], ["PATCH", "/api/me", vis], ["POST", "/api/events/ev-invention/pins", own], ["PATCH", "/api/organizers/me", own]]) {
    r = await c.req(m, p, "{rusak", { raw: true });
    check(`G-01 JSON rusak ${m} ${p} -> 400`, r.status === 400 && r.error?.code === "BAD_JSON", r.status);
  }
  for (const [m, p] of [["DELETE", "/api/campuses"], ["PUT", "/api/events"], ["GET", "/api/auth/login"], ["PUT", "/api/pins/pin-musala"]])
    check(`G-01 method salah ${m} ${p} -> 405`, (await vis.req(m, p)).status === 405);
  const errs = [await anon.login("x@y.z", "zzzzzzzz"), await own.post("/api/events", evBody({ name: "" })), await vis.req("POST", "/api/events", "{", { raw: true })];
  check("G-02 respons error tanpa stack/hash/secret", errs.every((e) => e.text && !/at .*\.(js|ts):\d|stack|\$2[aby]\$|passwordHash|tokenHash|DATABASE_URL/i.test(e.text)), errs.map((e) => e.text));
  check("G-02 format error {error:{code,message}}", errs.every((e) => e.error?.code && e.error?.message));

  // ---------- H ----------
  section("U. Unggah poster");
  const up = async (c, blob, name) => {
    const fd = new FormData(); if (blob) fd.append("file", blob, name);
    const res = await fetch(BASE + "/api/upload", { method: "POST", body: fd, headers: c.cookieHeader ? { cookie: c.cookieHeader } : {} });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const PNG1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  check("U-01 unggah tanpa login -> 401", (await up(anon, new Blob([PNG1], { type: "image/png" }), "a.png")).status === 401);
  check("U-01 unggah oleh pengunjung -> 403", (await up(vis, new Blob([PNG1], { type: "image/png" }), "a.png")).status === 403);
  check("U-02 tanpa file -> 400", (await up(own, null)).status === 400);
  check("U-02 tipe salah (text/plain) -> 400", (await up(own, new Blob(["halo"], { type: "text/plain" }), "a.txt")).status === 400);
  check("U-02 isi bukan gambar walau type image/png -> 400", (await up(own, new Blob(["bukan png"], { type: "image/png" }), "a.png")).status === 400);
  r = await up(own, new Blob([PNG1, Buffer.alloc(2 * 1024 * 1024)], { type: "image/png" }), "big.png");
  check("U-02 > 2MB -> 400", r.status === 400, r.json);
  r = await up(own, new Blob([PNG1], { type: "image/png" }), "poster.png");
  check("U-03 panitia unggah PNG -> 201 {url}", r.status === 201 && /^\/uploads\/[a-z0-9-]+\.png$/.test(r.json?.data?.url), r.json);
  const pUrl = r.json?.data?.url;
  const img = await fetch(BASE + pUrl);
  check("U-03 URL poster bisa diakses -> 200 image/png", img.status === 200 && img.headers.get("content-type") === "image/png");
  const pe = await own.post("/api/events", evBody({ name: `Poster ${uniq}`, posterUrl: pUrl }));
  check("U-04 event baru menyimpan posterUrl", pe.status === 201 && pe.data.posterUrl === pUrl, pe.json);
  if (pe.data?.id) {
    const g = await vis.get(`/api/events/${pe.data.id}`);
    check("U-04 GET event mengembalikan posterUrl", g.data?.posterUrl === pUrl);
    await own.del(`/api/events/${pe.data.id}`);
  }
  check("U-05 nama file asing -> 404", (await fetch(BASE + "/uploads/..%2Fetc.png")).status === 404);

  // ---------- N. Fitur baru: Admin, kuota, jadwal, surat pengajuan, reset password, Google ----------
  const { createHash, randomBytes } = await import("node:crypto");
  const sha = (s) => createHash("sha256").update(s).digest("hex");
  const adm = new Client("admin");
  section("N1. Admin — login & proteksi peran");
  r = await adm.login("admin@wayo.local", "admin123");
  check("N1-01 login admin seed -> 200 role ADMIN", r.status === 200 && r.data?.role === "ADMIN", r.json);
  check("N1-01 cookie wayo_role=ADMIN", adm.cookies.wayo_role === "ADMIN");
  r = await anon.post("/api/auth/register", { name: "Calon Admin", email: `adm-${uniq}@contoh.id`, password: "rahasia123", role: "ADMIN" });
  check("N1-02 daftar publik role ADMIN ditolak -> 400", r.status === 400 && r.error?.fields?.role, r.json);
  const adminGets = ["/api/admin/stats", "/api/admin/users", "/api/admin/events", "/api/admin/facilities", "/api/admin/registrations", "/api/admin/pins", "/api/admin/notifications"];
  for (const p of adminGets) {
    const st = [(await anon.get(p)).status, (await vis.get(p)).status, (await own.get(p)).status, (await adm.get(p)).status];
    check(`N1-03 GET ${p}: anon 401 / pengunjung 403 / panitia 403 / admin 200`, st.join() === "401,403,403,200", st);
  }
  for (const [m, p, b] of [["POST", "/api/admin/facilities", { name: "x", category: "TOILET" }], ["PATCH", "/api/admin/users/u-pengunjung", { role: "ADMIN" }], ["DELETE", "/api/admin/users/u-pengunjung"],
    ["POST", "/api/places", { name: "x", category: "GEDUNG", campusId: "sudirman", lat: -8.67, lng: 115.2 }], ["PATCH", "/api/places/pl-info", { name: "x" }], ["DELETE", "/api/places/pl-info"],
    ["DELETE", "/api/admin/registrations/x"], ["DELETE", "/api/admin/notifications/x"]]) {
    const st = [(await anon.req(m, p, b)).status, (await vis.req(m, p, b)).status, (await own.req(m, p, b)).status];
    check(`N1-04 ${m} ${p}: anon 401 / pengunjung 403 / panitia 403`, st.join() === "401,403,403", st);
  }
  const pageStatus = async (c, path) => { const x = await c.req("GET", path); return [x.status, x.headers.get("location") ?? ""]; };
  let ps = await pageStatus(anon, "/admin"); check("N1-05 /admin tanpa login -> redirect /login", ps[0] >= 300 && ps[0] < 400 && /\/login\?next=%2Fadmin/.test(ps[1]), ps);
  ps = await pageStatus(vis, "/admin"); check("N1-05 /admin oleh pengunjung -> redirect /home", /\/home$/.test(ps[1]), ps);
  ps = await pageStatus(own, "/admin/pengguna"); check("N1-05 /admin oleh panitia -> redirect /panitia", /\/panitia$/.test(ps[1]), ps);
  ps = await pageStatus(adm, "/admin"); check("N1-05 /admin oleh admin -> 200", ps[0] === 200, ps);
  ps = await pageStatus(adm, "/panitia"); check("N1-05 admin ke /panitia -> redirect /admin", /\/admin$/.test(ps[1]), ps);
  ps = await pageStatus(adm, "/scan"); check("N1-05 admin ke /scan -> redirect /admin", /\/admin$/.test(ps[1]), ps);
  ps = await pageStatus(anon, "/atur-ulang-password?token=x"); check("N1-05 /atur-ulang-password publik -> 200", ps[0] === 200, ps);
  r = await adm.get("/api/admin/stats");
  check("N1-06 statistik admin berisi jumlah", r.data && typeof r.data.users === "number" && r.data.admins >= 1 && typeof r.data.facilities === "number", r.data);

  section("N2. Admin — kelola pengguna");
  const meAdm = (await adm.get("/api/me")).data;
  r = await adm.patch(`/api/admin/users/${meAdm.id}`, { role: "VISITOR" });
  check("N2-01 admin ubah peran sendiri -> 400 SELF_CHANGE", r.status === 400 && r.error?.code === "SELF_CHANGE", r.json);
  r = await adm.del(`/api/admin/users/${meAdm.id}`);
  check("N2-01 admin hapus akun sendiri -> 400", r.status === 400, r.json);
  const tmp = new Client("tmp"); const tmpEmail = `tmp-${uniq}@contoh.id`;
  const tmpId = (await tmp.post("/api/auth/register", { name: "Akun Sementara", email: tmpEmail, password: "rahasia123" })).data?.id;
  r = await adm.get(`/api/admin/users?q=${encodeURIComponent(tmpEmail)}`);
  check("N2-02 daftar pengguna + cari -> berisi akun baru, tanpa hash", r.status === 200 && r.data.length === 1 && r.data[0].id === tmpId && !/passwordHash|\$2[aby]\$/.test(r.text), r.json);
  check("N2-02 filter role tidak dikenal -> 400", (await adm.get("/api/admin/users?role=RAJA")).status === 400);
  r = await adm.patch(`/api/admin/users/${tmpId}`, { role: "RAJA" });
  check("N2-03 peran tidak valid -> 400", r.status === 400 && r.error?.fields?.role, r.json);
  r = await adm.patch(`/api/admin/users/${tmpId}`, { role: "ORGANIZER" });
  check("N2-03 ubah ke ORGANIZER -> 200 + penyelenggara dibuat", r.status === 200 && r.data.role === "ORGANIZER" && !!r.data.organizerId, r.json);
  check("N2-03 sesi lama target dicabut setelah ubah peran -> 401", (await tmp.get("/api/me")).status === 401);
  r = await adm.patch(`/api/admin/users/${tmpId}`, { active: false });
  check("N2-04 nonaktifkan -> 200 active:false", r.status === 200 && r.data.active === false, r.json);
  r = await tmp.login(tmpEmail, "rahasia123");
  check("N2-04 login akun nonaktif -> 403 ACCOUNT_DISABLED", r.status === 403 && r.error?.code === "ACCOUNT_DISABLED", r.json);
  check("N2-04 lupa password akun nonaktif tetap 200 (tidak bocor)", (await anon.post("/api/auth/forgot", { email: tmpEmail })).status === 200);
  await adm.patch(`/api/admin/users/${tmpId}`, { active: true });
  check("N2-05 aktifkan lagi -> login 200", (await tmp.login(tmpEmail, "rahasia123")).status === 200);
  check("N2-06 PATCH pengguna tidak ada -> 404", (await adm.patch("/api/admin/users/tidak-ada", { active: true })).status === 404);

  section("N3. Kuota peserta");
  check("N3-01 kuota 0 -> 400", (r = await own.post("/api/events", evBody({ quota: 0 }))).status === 400 && r.error?.fields?.quota, r.json);
  check("N3-01 kuota bukan angka -> 400", (await own.post("/api/events", evBody({ quota: "abc" }))).status === 400);
  check("N3-01 kuota pecahan -> 400", (await own.post("/api/events", evBody({ quota: 1.5 }))).status === 400);
  r = await own.post("/api/events", evBody({ name: `Kuota ${uniq}`, quota: 1 }));
  check("N3-02 buat event kuota 1 -> 201 quota 1, remaining 1", r.status === 201 && r.data.quota === 1 && r.data.remaining === 1, r.json);
  const qEv = r.data?.id;
  const vis2 = new Client("visitor2");
  await vis2.post("/api/auth/register", { name: "Pengunjung Dua", email: `vis2-${uniq}@contoh.id`, password: "rahasia123" });
  check("N3-03 pengunjung 1 daftar -> 201", (await vis.post(`/api/events/${qEv}/register`)).status === 201);
  r = await vis2.post(`/api/events/${qEv}/register`);
  check("N3-03 pengunjung 2 saat penuh -> 409 EVENT_FULL", r.status === 409 && r.error?.code === "EVENT_FULL", r.json);
  r = await vis.get(`/api/events/${qEv}`);
  check("N3-04 detail event: remaining 0 (sisa kuota)", r.data?.remaining === 0 && r.data?.registrantCount === 1, r.data);
  check("N3-05 kuota dihapus (null) -> tanpa batas", (r = await own.patch(`/api/events/${qEv}`, { quota: null })).status === 200 && r.data.quota === null && r.data.remaining === null, r.json);
  check("N3-05 pengunjung 2 bisa daftar setelah kuota dibuka", (await vis2.post(`/api/events/${qEv}/register`)).status === 201);
  r = await own.patch(`/api/events/${qEv}`, { quota: 1 });
  check("N3-06 kuota di bawah jumlah pendaftar -> 400", r.status === 400 && r.error?.fields?.quota, r.json);
  check("N3-06 kuota = jumlah pendaftar -> 200", (await own.patch(`/api/events/${qEv}`, { quota: 2 })).status === 200);

  section("N4. Jadwal kegiatan (rundown)");
  const sp = `/api/events/${qEv}/schedule`;
  const sBody = (o = {}) => ({ title: "Sesi 1", startAt: iso(24), endAt: iso(25), speaker: "Narasumber A", location: "Ruang 1", ...o });
  check("N4-01 GET jadwal tanpa login -> 401", (await anon.get(sp)).status === 401);
  check("N4-01 GET jadwal pengunjung -> 200 []", (r = await vis.get(sp)).status === 200 && Array.isArray(r.data) && r.data.length === 0, r.json);
  check("N4-01 GET jadwal event tidak ada -> 404", (await vis.get("/api/events/tidak-ada/schedule")).status === 404);
  check("N4-02 POST jadwal oleh pengunjung -> 403", (await vis.post(sp, sBody())).status === 403);
  check("N4-02 POST jadwal oleh panitia lain -> 403", (await other.post(sp, sBody())).status === 403);
  check("N4-03 judul kosong -> 400", (r = await own.post(sp, sBody({ title: "" }))).status === 400 && r.error?.fields?.title, r.json);
  check("N4-03 selesai <= mulai -> 400", (r = await own.post(sp, sBody({ endAt: iso(23) }))).status === 400 && r.error?.fields?.endAt, r.json);
  r = await own.post(sp, sBody());
  check("N4-04 tambah jadwal -> 201", r.status === 201 && r.data.title === "Sesi 1" && r.data.speaker === "Narasumber A", r.json);
  const sid = r.data?.id;
  await own.post(sp, sBody({ title: "Sesi 0", startAt: iso(23), endAt: iso(24), speaker: null, location: null }));
  r = await vis.get(`/api/events/${qEv}`);
  check("N4-05 detail event berisi jadwal terurut waktu", r.data?.schedule?.length === 2 && r.data.schedule[0].title === "Sesi 0", r.data?.schedule);
  r = await own.patch(`${sp}/${sid}`, { title: "Sesi 1 (revisi)", location: "" });
  check("N4-06 ubah jadwal -> 200", r.status === 200 && r.data.title === "Sesi 1 (revisi)" && r.data.location === null, r.json);
  check("N4-06 ubah jadwal via event lain -> 404", (await own.patch(`/api/events/ev-invention/schedule/${sid}`, { title: "x" })).status === 404);
  check("N4-06 ubah jadwal oleh pengunjung -> 403", (await vis.patch(`${sp}/${sid}`, { title: "x" })).status === 403);
  check("N4-07 admin tambah jadwal di event mana pun -> 201", (await adm.post(sp, sBody({ title: "Sesi admin" }))).status === 201);
  check("N4-08 hapus jadwal -> 204", (await own.del(`${sp}/${sid}`)).status === 204);
  check("N4-08 hapus lagi -> 404", (await own.del(`${sp}/${sid}`)).status === 404);
  r = await vis.get("/api/events/ev-invention");
  check("N4-09 seed: ev-invention punya 3 jadwal", r.data?.schedule?.length === 3, r.data?.schedule);

  section("N5. Surat pengajuan (PDF, privat)");
  const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  const upPdf = async (c, ev, blob, name = "surat.pdf") => {
    const fd = new FormData(); if (blob) fd.append("file", blob, name);
    const res = await fetch(`${BASE}/api/events/${ev}/proposal`, { method: "POST", body: fd, headers: c.cookieHeader ? { cookie: c.cookieHeader } : {} });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const pdfBlob = (b = PDF, type = "application/pdf") => new Blob([b], { type });
  check("N5-01 unggah tanpa login -> 401", (await upPdf(anon, qEv, pdfBlob())).status === 401);
  check("N5-01 unggah oleh pengunjung -> 403", (await upPdf(vis, qEv, pdfBlob())).status === 403);
  check("N5-01 unggah oleh panitia lain -> 403", (await upPdf(other, qEv, pdfBlob())).status === 403);
  check("N5-02 tanpa file -> 400", (await upPdf(own, qEv, null)).status === 400);
  check("N5-02 bukan PDF (image/png) -> 400", (await upPdf(own, qEv, pdfBlob(PNG1, "image/png"), "a.png")).status === 400);
  check("N5-02 type PDF tapi isi bukan PDF -> 400", (await upPdf(own, qEv, pdfBlob(Buffer.from("halo")))).status === 400);
  check("N5-02 > 5 MB -> 400", (r = await upPdf(own, qEv, pdfBlob(Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]))) ).status === 400, r.json);
  r = await upPdf(own, qEv, pdfBlob(), "Surat Pengajuan Uji.pdf");
  check("N5-03 panitia pemilik unggah PDF -> 201", r.status === 201 && r.json?.data?.name === "Surat Pengajuan Uji.pdf", r.json);
  r = await own.get(`/api/events/${qEv}`);
  check("N5-04 pemilik melihat info surat", r.data?.proposal?.name === "Surat Pengajuan Uji.pdf", r.data?.proposal);
  r = await vis.get(`/api/events/${qEv}`);
  check("N5-04 pengunjung TIDAK melihat info surat", r.data && !("proposal" in r.data), Object.keys(r.data ?? {}));
  check("N5-04 daftar event pengunjung tanpa info surat", !(await vis.get("/api/events")).text.includes("Surat Pengajuan Uji"));
  check("N5-04 admin melihat info surat di /api/admin/events", (await adm.get("/api/admin/events")).data?.find((e) => e.id === qEv)?.proposal?.name === "Surat Pengajuan Uji.pdf");
  const dl = async (c) => { const res = await fetch(`${BASE}/api/events/${qEv}/proposal`, { headers: c.cookieHeader ? { cookie: c.cookieHeader } : {} }); return { status: res.status, type: res.headers.get("content-type"), buf: Buffer.from(await res.arrayBuffer()) }; };
  let d1 = await dl(own);
  check("N5-05 pemilik unduh -> 200 application/pdf", d1.status === 200 && d1.type === "application/pdf" && d1.buf.subarray(0, 5).toString() === "%PDF-", d1.status);
  d1 = await dl(adm); check("N5-05 admin unduh -> 200", d1.status === 200);
  check("N5-05 pengunjung unduh -> 403", (await dl(vis)).status === 403);
  check("N5-05 panitia lain unduh -> 403", (await dl(other)).status === 403);
  check("N5-05 tanpa login unduh -> 401", (await dl(anon)).status === 401);
  check("N5-06 hapus surat -> 204", (await own.del(`/api/events/${qEv}/proposal`)).status === 204);
  check("N5-06 unduh setelah dihapus -> 404", (await dl(own)).status === 404);
  check("N5-07 admin unggah surat event mana pun -> 201", (await upPdf(adm, qEv, pdfBlob())).status === 201);

  section("N6. Admin — kelola semua event, pin, data");
  r = await adm.patch(`/api/events/${qEv}`, { description: "Diubah admin" });
  check("N6-01 admin ubah event milik panitia -> 200", r.status === 200 && r.data.description === "Diubah admin", r.json);
  r = await own.post(`/api/events/${qEv}/pins`, { label: "Pin uji admin", category: "INFO", lat: -8.6729, lng: 115.22, type: "PERMANENT" });
  const apin = r.data?.id;
  check("N6-02 admin lihat semua pin", (await adm.get("/api/admin/pins")).data?.some((p) => p.id === apin && p.event?.id === qEv));
  check("N6-02 admin hapus pin -> 204", (await adm.del(`/api/pins/${apin}`)).status === 204);
  r = await adm.get(`/api/admin/registrations?eventId=${qEv}`);
  check("N6-03 admin lihat pendaftaran event -> 2", r.status === 200 && r.data.length === 2 && r.data[0].user?.email, r.json);
  const regId = r.data?.[0]?.id;
  check("N6-03 admin hapus pendaftaran -> 204", (await adm.del(`/api/admin/registrations/${regId}`)).status === 204);
  check("N6-03 hapus pendaftaran lagi -> 404", (await adm.del(`/api/admin/registrations/${regId}`)).status === 404);
  if (prisma) {
    const n = await prisma.notification.create({ data: { userId: "u-pengunjung", type: "EVENT_UPDATED", text: `Notif uji ${uniq}` } });
    check("N6-04 admin lihat notifikasi", (await adm.get("/api/admin/notifications")).data?.some((x) => x.id === n.id));
    check("N6-04 admin hapus notifikasi -> 204", (await adm.del(`/api/admin/notifications/${n.id}`)).status === 204);
    check("N6-04 hapus notifikasi lagi -> 404", (await adm.del(`/api/admin/notifications/${n.id}`)).status === 404);
  }
  r = await other.post("/api/events", evBody({ name: `Milik lain ${uniq}` }));
  check("N6-05 admin hapus event panitia lain -> 204", (await adm.del(`/api/events/${r.data?.id}`)).status === 204);

  section("N7. Data master tempat (Place CRUD)");
  const plBody = (o = {}) => ({ name: `Tempat Uji ${uniq}`, category: "GEDUNG", campusId: "sudirman", lat: -8.6725, lng: 115.219, description: "uji", ...o });
  check("N7-01 nama kosong -> 400", (r = await adm.post("/api/places", plBody({ name: "" }))).status === 400 && r.error?.fields?.name, r.json);
  check("N7-01 kategori salah -> 400", (await adm.post("/api/places", plBody({ category: "RAHASIA" }))).status === 400);
  check("N7-01 kampus tidak ada -> 400", (await adm.post("/api/places", plBody({ campusId: "mars" }))).status === 400);
  check("N7-01 lat di luar rentang -> 400", (await adm.post("/api/places", plBody({ lat: 100 }))).status === 400);
  r = await adm.post("/api/places", plBody());
  check("N7-02 tambah tempat -> 201", r.status === 201 && r.data.category === "GEDUNG" && r.data.campusId === "sudirman", r.json);
  const plId = r.data?.id;
  check("N7-02 tempat baru tampil di GET /api/places", (await vis.get("/api/places")).data?.some((p) => p.id === plId));
  r = await adm.patch(`/api/places/${plId}`, { name: "Tempat Uji (ubah)", category: "kantin" });
  check("N7-03 ubah tempat -> 200", r.status === 200 && r.data.name === "Tempat Uji (ubah)" && r.data.category === "KANTIN", r.json);
  check("N7-03 ubah tempat tidak ada -> 404", (await adm.patch("/api/places/tidak-ada", { name: "x" })).status === 404);
  r = await adm.del("/api/places/pl-ft");
  check("N7-04 hapus tempat yang dipakai event -> 409 PLACE_IN_USE + pesan jelas", r.status === 409 && r.error?.code === "PLACE_IN_USE" && /dipakai/.test(r.error.message), r.json);
  r = await adm.del("/api/places/pl-parkir-ft");
  check("N7-04 hapus tempat yang jadi fasilitas event -> 409", r.status === 409, r.json);
  const facOnPl = (await adm.post("/api/admin/facilities", { name: "Fasilitas di tempat uji", category: "TOILET", placeId: plId })).data;
  check("N7-05 hapus tempat tak terpakai -> 204", (await adm.del(`/api/places/${plId}`)).status === 204);
  check("N7-05 tempat terhapus -> 404", (await vis.get(`/api/places/${plId}`)).status === 404);
  check("N7-05 fasilitas yang menunjuk tempat itu → placeId null", (await adm.get(`/api/admin/facilities/${facOnPl?.id}`)).data?.placeId === null);
  await adm.del(`/api/admin/facilities/${facOnPl?.id}`);

  section("N8. Data master fasilitas (Admin)");
  check("N8-01 nama kosong -> 400", (await adm.post("/api/admin/facilities", { name: "", category: "TOILET" })).status === 400);
  check("N8-01 jenis tidak dikenal -> 400", (await adm.post("/api/admin/facilities", { name: "x", category: "KOLAM" })).status === 400);
  check("N8-01 placeId tidak ada -> 400", (await adm.post("/api/admin/facilities", { name: "x", category: "TOILET", placeId: "tidak-ada" })).status === 400);
  r = await adm.post("/api/admin/facilities", { name: `Musala ${uniq}`, category: "ibadah", placeId: "pl-info", description: "Lantai 1" });
  check("N8-02 tambah fasilitas -> 201", r.status === 201 && r.data.category === "IBADAH" && r.data.place?.id === "pl-info" && r.data.available === true, r.json);
  const facId = r.data?.id;
  check("N8-02 daftar fasilitas berisi seed + baru", (r = await adm.get("/api/admin/facilities")).data?.length >= 7 && r.data.some((f) => f.id === facId));
  r = await adm.patch(`/api/admin/facilities/${facId}`, { available: false, placeId: null });
  check("N8-03 ubah fasilitas -> 200", r.status === 200 && r.data.available === false && r.data.placeId === null, r.json);
  check("N8-03 available bukan boolean -> 400", (await adm.patch(`/api/admin/facilities/${facId}`, { available: "ya" })).status === 400);
  check("N8-04 hapus fasilitas -> 204", (await adm.del(`/api/admin/facilities/${facId}`)).status === 204);
  check("N8-04 GET setelah hapus -> 404", (await adm.get(`/api/admin/facilities/${facId}`)).status === 404);

  section("N9. Lupa & atur ulang password");
  check("N9-01 format email salah -> 400", (await anon.post("/api/auth/forgot", { email: "bukan-email" })).status === 400);
  const m1 = (await anon.post("/api/auth/forgot", { email: tmpEmail })).data?.message;
  const m2 = (await anon.post("/api/auth/forgot", { email: `takada2-${uniq}@contoh.id` })).data?.message;
  check("N9-02 respons sama untuk email terdaftar & tidak (non-enumerasi)", m1 && m1 === m2, [m1, m2]);
  if (prisma) {
    const toks = await prisma.passwordResetToken.findMany({ where: { userId: tmpId } });
    check("N9-03 token dibuat di DB (hash SHA-256, ±1 jam)", toks.length === 1 && toks[0].tokenHash.length === 64 && Math.abs(toks[0].expiresAt - Date.now() - 3600e3) < 120e3, toks);
    await anon.post("/api/auth/forgot", { email: tmpEmail });
    check("N9-03 minta ulang membatalkan token lama (tetap 1 aktif)", (await prisma.passwordResetToken.count({ where: { userId: tmpId, usedAt: null } })) === 1);
  }
  r = await anon.post("/api/auth/reset", { token: "a".repeat(64), password: "katasandibaru1" });
  check("N9-04 token palsu -> 400 INVALID_TOKEN", r.status === 400 && r.error?.code === "INVALID_TOKEN", r.json);
  check("N9-04 GET cek token palsu -> valid:false", (await anon.get(`/api/auth/reset?token=${"b".repeat(64)}`)).data?.valid === false);
  if (prisma) {
    const raw = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({ data: { userId: tmpId, tokenHash: sha(raw), expiresAt: new Date(Date.now() + 3600e3) } });
    check("N9-05 GET cek token valid -> valid:true", (await anon.get(`/api/auth/reset?token=${raw}`)).data?.valid === true);
    check("N9-05 password < 8 -> 400", (await anon.post("/api/auth/reset", { token: raw, password: "pendek" })).status === 400);
    check("N9-05 sebelum reset, sesi tmp aktif", (await tmp.get("/api/me")).status === 200);
    r = await anon.post("/api/auth/reset", { token: raw, password: "katasandibaru1" });
    check("N9-06 reset dengan token valid -> 200", r.status === 200, r.json);
    check("N9-06 semua sesi lama dicabut -> 401", (await tmp.get("/api/me")).status === 401);
    check("N9-06 login password lama -> 401", (await tmp.login(tmpEmail, "rahasia123")).status === 401);
    check("N9-06 login password baru -> 200", (await tmp.login(tmpEmail, "katasandibaru1")).status === 200);
    check("N9-07 token sekali pakai: dipakai lagi -> 400", (await anon.post("/api/auth/reset", { token: raw, password: "katasandibaru2" })).status === 400);
    const old = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({ data: { userId: tmpId, tokenHash: sha(old), expiresAt: new Date(Date.now() - 1000) } });
    check("N9-08 token kedaluwarsa -> 400", (await anon.post("/api/auth/reset", { token: old, password: "katasandibaru2" })).status === 400);
  }

  section("N10. Google OAuth");
  const gs = (await anon.get("/api/auth/google/status")).data;
  check("N10-01 status Google -> {configured:boolean}", typeof gs?.configured === "boolean", gs);
  if (!gs?.configured) {
    r = await anon.get("/api/auth/google?mode=login");
    check("N10-02 Google belum dikonfigurasi -> redirect /login?google=off", /\/login\?google=off$/.test(r.headers.get("location") ?? ""), r.headers.get("location"));
  } else if (process.env.GOOGLE_MOCK !== "0") {
    const { startGoogleMock } = await import("./google-mock.mjs");
    const mock = await startGoogleMock();
    const flow = async (c, qs, { tamper } = {}) => {
      const s = await c.get(`/api/auth/google?${qs}`);
      const loc = s.headers.get("location") ?? "";
      if (!/^http:\/\/localhost:\d+\/auth\?/.test(loc)) return loc; // langsung redirect ke halaman WAYO
      const a = await fetch(loc, { redirect: "manual" });
      let cb = new URL(a.headers.get("location"));
      if (tamper) cb.searchParams.set("state", "palsu");
      const res = await c.get(cb.pathname + cb.search);
      return res.headers.get("location") ?? `status ${res.status}`;
    };
    const gNew = new Client("gnew"); const gEmail = `g-${uniq}@gmail.test`;
    mock.setProfile({ sub: `g-${uniq}`, email: gEmail, email_verified: true, name: "Pengguna Google" });
    let loc = await flow(gNew, "mode=login");
    check("N10-03 login Google akun belum ada -> /daftar?google=baru (tanpa sesi)", /\/daftar\?google=baru/.test(loc) && !gNew.cookies.wayo_session, loc);
    loc = await flow(gNew, "mode=daftar");
    check("N10-04 daftar Google tanpa peran -> /daftar?google=peran", /\/daftar\?google=peran$/.test(loc), loc);
    loc = await flow(gNew, "mode=daftar&role=ADMIN");
    check("N10-04 daftar Google role ADMIN ditolak", /google=peran$/.test(loc) && !gNew.cookies.wayo_session, loc);
    loc = await flow(gNew, "mode=daftar&role=ORGANIZER", { tamper: true });
    check("N10-05 state tidak cocok -> google=gagal", /google=gagal$/.test(loc) && !gNew.cookies.wayo_session, loc);
    loc = await flow(gNew, "mode=daftar&role=ORGANIZER");
    check("N10-06 daftar Google sebagai Panitia -> /panitia + sesi", /\/panitia$/.test(loc) && !!gNew.cookies.wayo_session, loc);
    r = await gNew.get("/api/me");
    check("N10-06 akun Google: role ORGANIZER, google:true, organizer dibuat", r.data?.role === "ORGANIZER" && r.data.google === true && !!r.data.organizerId && r.data.email === gEmail, r.data);
    const gAgain = new Client("gagain");
    loc = await flow(gAgain, "mode=login&next=/panitia/event/baru");
    check("N10-07 login Google akun terdaftar -> next + sesi", /\/panitia\/event\/baru$/.test(loc) && !!gAgain.cookies.wayo_session, loc);
    const gVis = new Client("gvis");
    mock.setProfile({ sub: `g-vis-${uniq}`, email: "pengunjung@contoh.id", email_verified: true, name: "Pengunjung Demo" });
    loc = await flow(gVis, "mode=login");
    check("N10-08 email Google = akun lama -> ditautkan & masuk sebagai pengunjung", /\/home$/.test(loc) && (await gVis.get("/api/me")).data?.id === "u-pengunjung", loc);
    mock.setProfile({ sub: `g-unv-${uniq}`, email: `unv-${uniq}@gmail.test`, email_verified: false, name: "X" });
    loc = await flow(new Client("gunv"), "mode=daftar&role=VISITOR");
    check("N10-09 email Google belum terverifikasi -> ditolak", /google=belum-verifikasi$/.test(loc), loc);
    const gId = r.data?.id;
    await adm.patch(`/api/admin/users/${gId}`, { active: false });
    mock.setProfile({ sub: `g-${uniq}`, email: gEmail, email_verified: true, name: "Pengguna Google" });
    loc = await flow(new Client("gdis"), "mode=login");
    check("N10-10 akun Google dinonaktifkan -> google=nonaktif", /google=nonaktif$/.test(loc), loc);
    r = await anon.get("/api/auth/google/callback?code=x&state=y");
    check("N10-11 callback tanpa cookie state -> google=gagal", /google=gagal$/.test(r.headers.get("location") ?? ""), r.headers.get("location"));
    await adm.del(`/api/admin/users/${gId}`);
    if (prisma) await prisma.user.update({ where: { id: "u-pengunjung" }, data: { googleId: null } });
    await mock.close();
  }

  section("N11. Hapus akun (Admin)");
  r = await adm.del(`/api/admin/users/${tmpId}`);
  check("N11-01 hapus akun -> 204", r.status === 204, r.json);
  check("N11-01 hapus lagi -> 404", (await adm.del(`/api/admin/users/${tmpId}`)).status === 404);
  check("N11-01 akun terhapus tidak bisa login", (await tmp.login(tmpEmail, "katasandibaru1")).status === 401);
  await own.del(`/api/events/${qEv}`);

  // bersih-bersih event yang dibuat matriks B
  for (const [, c, id] of created) if (c === own || c === other) await c.del(`/api/events/${id}`);
  await own.patch("/api/events/ev-invention", { description: (await import("../data/events.json", { with: { type: "json" } })).default.events.find((e) => e.id === "ev-invention").description });
  if (prisma) await prisma.$disconnect();

  console.log(`\n${pass} lulus, ${fail} gagal`);
  if (fail) { console.log("Gagal:\n - " + fails.join("\n - ")); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });
