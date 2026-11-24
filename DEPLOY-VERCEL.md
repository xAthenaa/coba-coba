# Deploy WAYO ke Vercel

Aplikasi ini Next.js 15 + Prisma (PostgreSQL) + Vercel Blob. Jangan memakai SQLite di Vercel: file di disk tidak permanen.

## 1. Database PostgreSQL (Neon atau Supabase)

**Neon (disarankan, gratis):**
1. Buat akun di [neon.tech](https://neon.tech), lalu buat project baru (region dekat, misalnya Singapore).
2. Di dashboard, salin dua URL:
   - **Pooled** (connection pooling) → `DATABASE_URL`
   - **Direct** / non-pooling → `DIRECT_URL` (wajib untuk `prisma migrate`)
3. Tambahkan `?sslmode=require` jika belum ada di URL.

**Supabase:**
1. Buat project di [supabase.com](https://supabase.com).
2. Settings → Database: salin **Connection string** (URI).
   - Transaction pooler (port 6543) → `DATABASE_URL` (tambah `?pgbouncer=true`)
   - Direct (port 5432) → `DIRECT_URL`

Lokal (pengembangan):
```bash
# Postgres 17 sudah terpasang, contoh:
#   sudo -u postgres psql -c "CREATE USER wayo WITH PASSWORD 'wayo' LOGIN CREATEDB;"
#   sudo -u postgres psql -c "CREATE DATABASE wayo OWNER wayo;"
cp .env.example .env
# DATABASE_URL dan DIRECT_URL default: postgresql://wayo:wayo@localhost:5432/wayo
npm install
npm run db:fresh    # migrate deploy + seed
npm run dev
```

## 2. Vercel Blob (poster & surat pengajuan)

1. Di proyek Vercel: **Storage → Create Database → Blob**.
2. Pilih akses **Private** (disarankan: surat pengajuan tidak boleh publik di URL Blob) atau **Public**. Kode menyesuaikan otomatis.
3. Hubungkan ke environment Production, Preview, dan Development, lalu salin `BLOB_READ_WRITE_TOKEN`.
4. Poster tetap diakses di URL lama `/uploads/[nama]` (bukan URL Blob). Surat pengajuan hanya lewat `GET /api/events/[id]/proposal` (cek login panitia/admin).

Tanpa token, file disimpan di disk `data/uploads` dan `data/proposals` (cocok untuk `npm run dev` dan tes lokal).

## 3. Environment di dashboard Vercel

Project → Settings → Environment Variables. Isi minimal Production (dan Preview bila dipakai):

| Variabel | Wajib | Isi |
|---|---|---|
| `DATABASE_URL` | ya | URL Postgres (boleh pooled) |
| `DIRECT_URL` | ya | URL Postgres langsung (tanpa pooler). Lokal: sama dengan `DATABASE_URL` |
| `BASE_URL` | ya | `https://domain-anda.vercel.app` (tanpa garis miring di akhir) |
| `BLOB_READ_WRITE_TOKEN` | ya di produksi | Token Blob dari langkah 2 |
| `WAYO_ADMIN_EMAIL` | ya sebelum seed | Email admin **baru**, jangan `admin@wayo.local` |
| `WAYO_ADMIN_PASSWORD` | ya sebelum seed | Password kuat, **jangan** `admin123` |
| `WAYO_ADMIN2_EMAIL`, `WAYO_ADMIN2_PASSWORD` | tidak | Admin kedua (`u-admin-2`, default `admin2@wayo.local` / `admin123`). Ganti bila akun ini dipakai di produksi. |
| `WAYO_ADMIN3_EMAIL`, `WAYO_ADMIN3_PASSWORD` | tidak | Admin ketiga (`u-admin-3`, default `admin3@wayo.local` / `admin123`). Ganti bila akun ini dipakai di produksi. |
| `WAYO_DEMO` | tidak | Kosongkan di produksi (jangan `1`) |
| `GOOGLE_CLIENT_ID` | untuk login Google | dari Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | untuk login Google | dari Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | disarankan | `https://domain-anda.vercel.app/api/auth/google/callback` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | untuk lupa password | SMTP (misalnya Gmail App Password). Kosong = tautan hanya tercetak di log server |
| `OSRM_URL` | tidak | Default publik sudah cukup |

Build di Vercel menjalankan `npm run vercel-build` (`prisma generate && prisma migrate deploy && next build`). Pastikan `DATABASE_URL` dan `DIRECT_URL` sudah terisi sebelum deploy pertama.

## 4. Redirect Google OAuth

Di [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client (Web):
- Authorized JavaScript origins: `https://domain-anda.vercel.app`
- Authorized redirect URIs: `https://domain-anda.vercel.app/api/auth/google/callback`

URI ini harus sama dengan `GOOGLE_REDIRECT_URI` / `${BASE_URL}/api/auth/google/callback`.

## 5. Seed data sekali ke database produksi

Migrasi tabel dijalankan otomatis saat build. Data akun, kampus, dan organizer di-seed; **tempat, pin, dan event contoh tidak** (array `places`/`pins` kosong; event butuh `placeId`). Jalankan **sekali** dari komputer kamu (ganti URL dan password admin):

```bash
DATABASE_URL="postgresql://...direct..." \
DIRECT_URL="postgresql://...direct..." \
WAYO_ADMIN_EMAIL="admin@organisasi-anda.id" \
WAYO_ADMIN_PASSWORD="password-kuat-anda" \
WAYO_ADMIN2_EMAIL="admin2@organisasi-anda.id" \
WAYO_ADMIN2_PASSWORD="password-kuat-anda-2" \
WAYO_ADMIN3_EMAIL="admin3@organisasi-anda.id" \
WAYO_ADMIN3_PASSWORD="password-kuat-anda-3" \
npm run db:seed
```

Pakai URL **direct** (bukan pooler). Jangan jalankan `db:fresh` atau `db:reset` ke database produksi — keduanya menghapus semua baris.

## 6. Ganti password admin

Akun admin hanya dibuat oleh seed (`u-admin`, `u-admin-2`, `u-admin-3`). Setelah seed, masuk dengan email/password yang kamu set di langkah 5. Bila masih memakai default `admin@wayo.local` / `admin2@wayo.local` / `admin3@wayo.local` dan `admin123`, segera seed ulang dengan `WAYO_ADMIN_*` / `WAYO_ADMIN2_*` / `WAYO_ADMIN3_*` yang baru (upsert akan menimpa password masing-masing) atau ganti manual di database.

## 7. Deploy

1. Push branch ke GitHub, impor repositori di [vercel.com](https://vercel.com) (Framework: Next.js).
2. Isi env di langkah 3, lalu Deploy.
3. Setelah domain aktif, jalankan seed (langkah 5) bila datanya masih kosong.
4. Uji: buka `/login`, masuk, unggah poster, dan cek reset password.
