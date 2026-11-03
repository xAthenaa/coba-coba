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
    check("G-03 jumlah seed = isi JSON (3 event, 3 org, 11 tempat, 5 pin, 2 user JSON, 3 QR)", before.e === 3 && before.o === 3 && before.p === 11 && before.pin === 5 && before.u === 2 && before.qr === 3, before);
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
  // PIN_NEW: daftarkan pengunjung ke ev-invention lalu buat pin
  await vis.post("/api/events/ev-invention/register");
  const pn = (await own.post("/api/events/ev-invention/pins", { ...pinBase, label: "Pin Notif", type: "PERMANENT" })).data;
  check("D POST pin -> PIN_NEW ke pendaftar", (await vis.get("/api/notifications")).data.items.some((n) => n.type === "PIN_NEW" && n.pinId === pn.id));
  for (const p of [timedPin, past, future, pn]) await own.del(`/api/pins/${p.id}`);
  await vis.del("/api/events/ev-invention/register");

  // ---------- E. QR ----------
  section("E. QR");
  r = await own.get("/api/events/ev-invention/qr");
  check("E-01 GET QR milik sendiri -> 200 {code,url}", r.status === 200 && r.data.url.endsWith(`/q/${r.data.code}`), r.json);
  const c0 = r.data.code;
  r = await own.post("/api/events/ev-invention/qr/regenerate");
  check("E-01 regenerate -> 201 token baru unik", r.status === 201 && r.data.code !== c0, r.json);
  const c1 = r.data.code;
  check("E-01 QR event org lain -> 403", (await own.get("/api/events/ev-webinar/qr")).status === 403);
  r = await vis.get(`/api/qr/${c1}`);
  check("E-02 resolve QR valid -> 200 {eventId,placeId,lat,lng,campusId}", r.status === 200 && r.data.eventId === "ev-invention" && r.data.placeId && typeof r.data.lat === "number" && r.data.campusId === "sudirman", r.json);
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
  check("F-02 filter campusId=jimbaran -> []", (await vis.get("/api/places?campusId=jimbaran")).data.length === 0);
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

  // bersih-bersih event yang dibuat matriks B
  for (const [, c, id] of created) if (c === own || c === other) await c.del(`/api/events/${id}`);
  await own.patch("/api/events/ev-invention", { description: (await import("../data/events.json", { with: { type: "json" } })).default.events.find((e) => e.id === "ev-invention").description });
  if (prisma) await prisma.$disconnect();

  console.log(`\n${pass} lulus, ${fail} gagal`);
  if (fail) { console.log("Gagal:\n - " + fails.join("\n - ")); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });
