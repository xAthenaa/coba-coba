# WAYO — Way To Go (Web UI prototype)

Prototype **UI saja** (tanpa backend) aplikasi peta & navigasi jalan kaki area event kampus Universitas Udayana.
Next.js 15 App Router · TypeScript · Tailwind v4 · Leaflet + OpenStreetMap (react-leaflet, client-only) · html5-qrcode · qrcode.
Layout mobile max-width 440px (iPhone 16 Pro Max 440×956), margin 24px, Poppins, primary navy `#1E3A8A`.

## Setup
```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm run lint
npx playwright install chromium
npm run test:e2e       # smoke test 440x956: semua route, tanpa console error
npm run shots          # screenshot ke ../shots (SHOTS_DIR untuk mengubah)
```
Akun demo (data contoh): `pengunjung@contoh.id` / `demo123`, `panitia@contoh.id` / `demo123`, atau "Masuk sebagai tamu" (tamu **tidak bisa** scan QR).

## Struktur
- `data/*.json` — data contoh dari Gigi (bertanda `_contoh`), Kampus Sudirman.
- `src/lib/api.ts` — lapisan akses data **async** (ganti isi fungsi dengan `fetch('/api/...')` saat backend siap). Perubahan (event/pin/daftar) disimpan di localStorage di atas JSON; reset di Profil › Pengaturan.
- `src/lib/data.ts` seed + helper status (event berlangsung/selesai, pin Aktif/Terjadwal/Kedaluwarsa) · `src/lib/store.ts` store localStorage · `src/lib/auth.ts` sesi tiruan (`wayo_session`).
- `src/lib/tokens.ts` + `src/app/globals.css` (`@theme`) — design tokens dari `design-tokens.md` (Bocil).
- `src/components/` — Screen, Header, BottomNav (Pengunjung/Panitia), Modal/Sheet (overlay), Toast, MapView (dynamic, ssr:false), PetaView, EventForm, PinForm.
- Lokasi: `navigator.geolocation` (watchPosition). Jika di luar kampus (>3 km) dipakai posisi simulasi; ditolak/GPS mati/offline → banner. Demo state: `?lokasi=mati|ditolak|offline`.
- Rute = polyline simulasi berbentuk L (tanpa API routing); ETA = jarak / 1,3 m/s. Navigasi aktif menyimulasikan berjalan (~18 dtk) + banner "Rute diperbarui".
- QR Peta berisi URL `<origin>/peta/event/<eventId>`. Halaman Scan punya **Simulasi scan**, input kode manual, dan **Simulasi QR tidak valid**.

## Route ↔ ID layar
| Route | Layar |
|---|---|
| `/` | S-00 Splash |
| `/login` | L-01 (toggle Pengunjung/Panitia = L-01-panitia), banner "perlu login" `?perlu=login` |
| `/daftar` | L-02 / L-02b |
| `/lupa-password` | L-05 → L-05b Cek Email → L-05c (toast kirim ulang) |
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

Semua data adalah **contoh**, bukan data asli. Peta © OpenStreetMap contributors.
