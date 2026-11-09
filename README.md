# WAYO — Way To Go

Aplikasi peta & navigasi jalan kaki area event kampus Universitas Udayana — UI + backend (Next.js route handlers + Prisma).
Next.js 15 App Router · TypeScript · Tailwind v4 · Leaflet/OSM · SWR · Prisma 6 (SQLite dev, siap Postgres) · bcryptjs · qrcode.
Layout mobile max-width 440px (iPhone 16 Pro Max 440×956), margin 24px, Poppins, primary navy `#1E3A8A`.

## Setup
```bash
cp .env.example .env   # DATABASE_URL, BASE_URL, WAYO_DEMO (+ Google OAuth & SMTP opsional, lihat di bawah)
npm install            # juga menjalankan prisma generate
npm run db:fresh       # migrate deploy + kosongkan tabel + seed
npm run dev            # http://localhost:3000
```
Skrip DB: `db:migrate` (migrate dev), `db:seed` (idempoten, ID sama dengan data JSON), `db:fresh` (migrate deploy + kosongkan semua baris + seed; dipakai tes), `db:reset` (`prisma migrate reset`, merusak data).

Akun demo: `pengunjung@contoh.id` / `demo123` (PENGUNJUNG), `panitia@contoh.id` / `demo123` (PANITIA), **`admin@wayo.local` / `admin123` (ADMIN)**. Mode tamu dihapus.
Akun Admin **hanya** dibuat oleh seed (`npm run db:seed` / `db:fresh`), tidak bisa lewat Daftar publik atau Google. Ganti di produksi lewat env `WAYO_ADMIN_EMAIL` / `WAYO_ADMIN_PASSWORD` sebelum seed.

### Variabel lingkungan
| Env | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | SQLite `file:./dev.db` (atau Postgres) |
| `BASE_URL` | disarankan | Origin publik; dipakai untuk tautan reset password & redirect Google |
| `WAYO_DEMO` | tidak | `1` = aktifkan `/api/dev/qr-sample` |
| `WAYO_ADMIN_EMAIL`, `WAYO_ADMIN_PASSWORD` | tidak | Akun admin seed (default `admin@wayo.local` / `admin123`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | untuk Google | OAuth 2.0 Client (Web) dari Google Cloud Console. Kosong → tombol Google menampilkan pesan "belum dikonfigurasi" |
| `GOOGLE_REDIRECT_URI` | tidak | Default `${BASE_URL}/api/auth/google/callback`; daftarkan di "Authorized redirect URIs" |
| `GOOGLE_AUTH_URL`, `GOOGLE_TOKEN_URL`, `GOOGLE_USERINFO_URL` | tidak | Hanya untuk tes (mock `tests/google-mock.mjs`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM` | untuk email | Pengiriman email reset password (nodemailer). `SMTP_HOST` kosong → tautan reset **dicetak di console server** (mode dev) |
| `OSRM_URL` | tidak | Server OSRM untuk rute jalan (default publik) |

### Peran & fitur
- **Pengunjung (VISITOR)**, **Panitia (ORGANIZER)** — dipilih saat Daftar (form atau Google). **Admin (ADMIN)** — dari seed.
- **Admin** (`/admin`): dashboard ringkasan; kelola semua akun (ubah peran, nonaktif/aktifkan, hapus — tidak bisa mengubah/menghapus diri sendiri; perubahan mencabut sesi target); kelola semua event (ubah lewat form yang sama + jadwal, hapus); data master **tempat** (tambah/ubah/hapus; hapus ditolak `409 PLACE_IN_USE` bila masih dipakai event sebagai lokasi/fasilitas); data master **fasilitas**; pengawasan & penghapusan pendaftaran, pin, notifikasi.
- **Login/Daftar Google**: OAuth 2.0 authorization code flow (tanpa library; state acak di cookie httpOnly 10 menit; email harus terverifikasi). Email Google yang sudah terdaftar akan ditautkan. Akun baru wajib memilih peran di halaman Daftar.
- **Lupa password**: `POST /api/auth/forgot` membuat token acak (disimpan SHA-256, berlaku 1 jam, sekali pakai, token lama dibatalkan) dan mengirim email berisi `/atur-ulang-password?token=…`. Respons selalu sama (tidak membocorkan email terdaftar). Setelah reset, semua sesi pengguna dicabut.
- **Event**: kuota peserta (opsional; daftar ditolak `409 EVENT_FULL` saat penuh; sisa kuota tampil di detail), **surat pengajuan** PDF ≤ 5 MB (disimpan privat di `data/proposals`, hanya panitia pemilik & admin yang bisa melihat/mengunduh), **jadwal kegiatan/rundown** terpisah (judul, mulai, selesai, pembicara, lokasi) di `/panitia/event/[id]/jadwal`, tampil di detail event.
`WAYO_DEMO=1` mengaktifkan `/api/dev/qr-sample` (dipakai tombol "simulasi scan"); matikan di produksi.

### Pindah ke Postgres
1. `prisma/schema.prisma`: `provider = "postgresql"` (enum sudah disimpan sebagai string, tidak perlu ubah model).
2. `.env`: `DATABASE_URL="postgresql://user:pass@host:5432/wayo"`.
3. Hapus `prisma/migrations` (migrasi SQLite) lalu `npx prisma migrate dev --name init` dan `npm run db:seed`.

## Tes
```bash
npm run build && npm run lint && npx prisma validate
npm run start &                       # atau npm run dev
WAYO_URL=http://localhost:3000 npm run test:api   # tests/api.mjs (fetch saja; WAYO_SKIP_DB=1 lewati cek DB)
npx playwright install chromium
npm run test:e2e                      # build dulu; server :3100 dengan db:fresh
SHOTS=1 npm run shots                 # screenshot
```
Jalankan `npm run db:fresh` sebelum `test:api` agar data deterministik.
Tes Google OAuth memakai mock lokal (`tests/google-mock.mjs`, port 3918). Jalankan server dengan
`GOOGLE_CLIENT_ID=test GOOGLE_CLIENT_SECRET=test GOOGLE_AUTH_URL=http://localhost:3918/auth GOOGLE_TOKEN_URL=http://localhost:3918/token GOOGLE_USERINFO_URL=http://localhost:3918/userinfo GOOGLE_REDIRECT_URI=http://localhost:<port>/api/auth/google/callback`;
tanpa env Google, tes memeriksa pesan "belum dikonfigurasi".

## API
Envelope `{data}` / `{error:{code,message,fields?}}`. Sesi: cookie httpOnly `wayo_session` (token 32 byte, disimpan SHA-256, 7 hari) + cookie petunjuk `wayo_role` untuk middleware. Urutan cek: 401 → 403 → 404; 405 metode salah; 409 konflik; 400 JSON rusak/validasi.
- Auth: `POST /api/auth/register|login|logout|forgot`
- Me: `GET|PATCH /api/me`, `GET /api/me/registrations`
- `GET /api/campuses`, `GET /api/places?lat&lng` (Haversine), `GET /api/places/[id]`
- Events: `GET|POST /api/events` (`mine, organizerId, faculty, campusId, q, status`), `GET|PATCH|DELETE /api/events/[id]`, `POST|DELETE /api/events/[id]/register`
- Pins: `GET|POST /api/events/[id]/pins`, `GET /api/pins?eventId&category`, `GET|PATCH|DELETE /api/pins/[id]`
- QR: `GET /api/events/[id]/qr`, `GET /api/events/[id]/qr/png`, `POST /api/events/[id]/qr/regenerate`, `GET /api/qr/[code]`; halaman `/q/[code]`
- Organizers: `GET /api/organizers`, `GET /api/organizers/[id]`, `GET|PATCH /api/organizers/me`
- Notifikasi: `GET /api/notifications` (EVENT_START/PIN_EXPIRING dibuat lazy), `POST /api/notifications/[id]/read`, `POST /api/notifications/read-all`
- Auth tambahan: `POST /api/auth/forgot {email}`, `GET /api/auth/reset?token=` → `{valid}`, `POST /api/auth/reset {token,password}`; Google: `GET /api/auth/google/status`, `GET /api/auth/google?mode=login|daftar&role=VISITOR|ORGANIZER&next=`, `GET /api/auth/google/callback`
- Event tambahan: body event menerima `quota` (int ≥ 1 / null); respons berisi `quota`, `remaining`, `schedule[]`, dan `proposal` (hanya untuk pemilik/admin). `GET|POST|DELETE /api/events/[id]/proposal` (multipart `file`, PDF), `GET|POST /api/events/[id]/schedule`, `PATCH|DELETE /api/events/[id]/schedule/[itemId]`
- Tempat (Admin): `POST /api/places`, `PATCH|DELETE /api/places/[id]`
- Admin (semua cek ADMIN di server; 401/403): `GET /api/admin/stats`, `GET /api/admin/users?q&role`, `PATCH|DELETE /api/admin/users/[id]` (`{role, active}`), `GET /api/admin/events`, `GET|POST /api/admin/facilities`, `GET|PATCH|DELETE /api/admin/facilities/[id]`, `GET /api/admin/registrations?eventId`, `DELETE /api/admin/registrations/[id]`, `GET /api/admin/pins` (hapus via `DELETE /api/pins/[id]`), `GET /api/admin/notifications`, `DELETE /api/admin/notifications/[id]`. Admin juga boleh `PATCH|DELETE /api/events/[id]`, pin, QR, jadwal, dan surat pengajuan event mana pun.

## Struktur
- `data/*.json` — data contoh dari Gigi (bertanda `_contoh`), Kampus Sudirman.
- `src/lib/api.ts` — lapisan akses data **async** (ganti isi fungsi dengan `fetch('/api/...')` saat backend siap). Perubahan (event/pin/daftar) disimpan di localStorage di atas JSON; reset di Profil › Pengaturan.
- `src/server/*` logika backend (http, auth, validate, rules, serialize, qr, notify) · `src/app/api/**` route handlers · `src/lib/api.ts` hook SWR + mapping · `src/lib/auth.ts` sesi via `/api/me` · `src/middleware.ts` proteksi halaman per peran · `prisma/` skema, migrasi, seed.
- `src/lib/tokens.ts` + `src/app/globals.css` (`@theme`) — design tokens dari `design-tokens.md` (Bocil).
- `src/components/` — Screen, Header, BottomNav (Pengunjung/Panitia), Modal/Sheet (overlay), Toast, MapView (dynamic, ssr:false), PetaView, EventForm, PinForm.
- Lokasi: `navigator.geolocation` (watchPosition). Jika di luar kampus (>3 km) dipakai posisi simulasi; ditolak/GPS mati/offline → banner. Demo state: `?lokasi=mati|ditolak|offline`.
- Rute mengikuti jalan raya lewat `/api/route` (OSRM, fallback garis L); ETA = jarak / 1,3 m/s. Navigasi aktif menyimulasikan berjalan (~18 dtk, dimulai setelah rute dimuat) + banner "Rute diperbarui".
- QR Peta berisi URL `<origin>/peta/event/<eventId>`. Halaman Scan punya **Simulasi scan**, input kode manual, dan **Simulasi QR tidak valid**.

## Route ↔ ID layar
| Route | Layar |
|---|---|
| `/` | S-00 Splash |
| `/login` | L-01 (peran dari akun; tombol "Masuk dengan Google"), banner "perlu login" `?perlu=login`, pesan Google `?google=` |
| `/daftar` | L-02 / L-02b |
| `/lupa-password` | L-05 → L-05b Cek Email → L-05c (toast kirim ulang) |
| `/atur-ulang-password?token=` | L-05d Atur ulang password dari tautan email |
| `/admin` · `/admin/pengguna` · `/admin/event` · `/admin/event/[id]` · `/admin/tempat` · `/admin/fasilitas` · `/admin/data` | A-01 Dashboard · A-02 Pengguna · A-03 Event · A-03b Edit event · A-04 Tempat · A-05 Fasilitas · A-06 Pengawasan data |
| `/izin-lokasi` | L-03 / L-03b (`?status=ditolak`) |
| `/notifikasi` | L-04 |
| `/home` | V-01, V-01b (banner lokasi mati), V-01f (`?fakultas=`) |
| `/event/[id]` | V-02, V-02b (toast terdaftar → /event-saya), V-02c event selesai |
| `/event-saya` | V-09 (tab Terdaftar/Terlewati) |
| `/penyelenggara` · `/penyelenggara/[id]` | V-11 · V-12 |
| `/peta` | V-03, V-03L lokasi saya, V-03c offline/lokasi mati, filter V-03t/g/e/k/p/i/s `?kategori=`, fokus `?fokus=<id>` |
| `/peta/event/[id]` | V-03q Peta dari QR |
| `/peta/cari` | V-04 / V-04b kosong |
| `/peta/tempat/[id]` | V-05 / V-05b (pin berbasis waktu) — id tempat atau pin |
| `/peta/rute/[id]` | V-06 Pratinjau Rute |
| `/peta/navigasi/[id]` | V-07 Navigasi Aktif (tanpa navbar) |
| `/peta/tiba/[id]` | V-08 Sampai Tujuan |
| `/scan` | V-10a Izin Kamera → V-10 Scan (V-10s senter, V-10b QR tidak valid) — wajib login |
| `/profil` | V-13 / V-13p (panitia), V-13f konfirmasi keluar (overlay) |
| `/profil/edit` | V-13a, V-13g ubah foto (sheet), V-13h/V-13b (toast) |
| `/profil/pengaturan` · `/profil/faq` · `/profil/tentang` | V-13c · V-13d · V-13e |
| `/panitia` | P-01 Kelola (toast P-01b "Event dihapus") |
| `/panitia/event/baru` · `/panitia/event/[id]/edit` | P-02 |
| `/panitia/event/[id]` | P-03 + P-07 overlay hapus |
| `/panitia/event/[id]/pin` | P-04 (toast P-04b/P-04c) |
| `/panitia/event/[id]/pin/baru` · `/pin/[pinId]` | P-05 (waktu) / P-05b (permanen) + P-08 overlay hapus pin |
| `/panitia/event/[id]/qr` | P-06, P-06b (toast unduh/bagikan), P-06c pratinjau cetak |
| `/panitia/event/[id]/jadwal` | P-09 Jadwal kegiatan (rundown) |

Semua data adalah **contoh**, bukan data asli. Peta © OpenStreetMap contributors.
