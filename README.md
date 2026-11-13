# CTF Platform

Platform latihan CTF berbasis tim. Fondasi menggunakan vinext, React, TypeScript,
Tailwind CSS, dan Cloudflare Workers. Penyimpanan aplikasi hanya D1 dan Durable
Objects berbasis SQLite. File challenge nantinya berupa tautan unduhan.

## Status

Milestone 1–2 telah diimplementasikan: koneksi penyimpanan lokal, migrasi dasar,
beranda, aturan, sistem desain Press Start 2P, dan mega menu responsif.
Login Google, tim, challenge, dan skor mengikuti milestone berikutnya.
Lihat [daftar milestone](docs/MILESTONES.md) dan [panduan desain](docs/DESIGN.md).

## Menjalankan lokal

Gunakan Node.js 22.18+ dan npm. Perintah di bawah menggunakan resource lokal;
tidak memerlukan login Cloudflare atau kredensial Google.

```sh
npm ci
npm run cf-typegen
npm run db:migrate:local
npm run dev
```

Buka URL Local yang dicetak Vite. Port default 5173; Vite memilih port berikutnya
jika port tersebut sedang dipakai. Data lokal disimpan di `.cloudflare/state`
untuk CLI maupun Vite dan tetap tersedia setelah server dimulai ulang.

Migrasi dapat dijalankan ulang; hanya migrasi yang belum tercatat yang diterapkan.
`migrations/0001_foundation.sql` menyediakan pengaturan dan kategori, tanpa akun
atau data permainan palsu. Durable Object membuat skema SQLite sendiri saat
pertama diakses; lifecycle kelasnya dideklarasikan melalui `exports.durableObject`
di `cloudflare.config.ts`.

## Verifikasi

Dengan dev server berjalan:

```sh
npm run typecheck
npm test
npm run build
npm run check:foundation
```

Jika URL berbeda, tentukan origin pemeriksaan:

```powershell
$env:CHECK_ORIGIN = 'http://127.0.0.1:5174'
npm run check:foundation
```

`npm test` menjalankan tujuh pengujian interaksi komponen navigasi dalam DOM:
visibilitas berdasarkan role, pergantian panel, Escape/fokus, klik di luar,
penutupan menu mobile setelah memilih tautan, dan halaman aktif. Tes ini tidak
menggantikan pemeriksaan layout atau screenshot di browser.

`npm run check:foundation` mengakses `/api/health`, melakukan lima permintaan bersamaan,
memeriksa halaman/404, dan mengunduh font lokal. Health check benar-benar membaca
versi skema D1 dan memanggil RPC Durable Object melalui binding. Respons gagal
menggunakan HTTP 503 dan tidak menampilkan rincian error internal.

Di mode development, health check menyertakan waktu inisialisasi Durable Object.
Untuk memeriksa persistensi, catat timestamp tersebut, hentikan dan mulai ulang
server, lalu jalankan:

```powershell
$env:EXPECTED_COORDINATOR_INITIALIZED_AT = 'timestamp-yang-dicetak-pemeriksaan'
npm run check:foundation
```

`ParticipantCoordinator` saat ini menyiapkan penyimpanan dan pemeriksaan koneksi.
Pembatasan percobaan flag diimplementasikan pada milestone 7.

## Struktur

- `app/`: halaman, root layout, dan endpoint health.
- `components/`: header/mega menu, footer, ikon pixel.
- `lib/navigation.ts`: kelompok navigasi publik dan panitia.
- `lib/durable-objects/`: kelas koordinasi peserta.
- `migrations/`: migrasi SQL D1.
- `worker.ts`: meneruskan handler vinext dan mengekspor Durable Object.
- `public/fonts/`: font lokal dan lisensinya.

## Konfigurasi dan deployment

Konfigurasi proyek menggunakan `cf`, bukan Wrangler. Jalankan kembali
`npm run cf-typegen` setelah mengubah binding. Tidak ada binding R2, KV,
atau layanan Images.

ID `3d05ae4a-7641-4bc7-8c46-08edc42f201d` pada konfigurasi dan perintah migrasi
hanya mengidentifikasi simulasi lokal. Sebelum deployment, tentukan
`CLOUDFLARE_D1_DATABASE_ID` dengan ID database produksi sungguhan, gunakan
`APP_ENV=production`, dan terapkan migrasi ke database tersebut. Perintah
`db:migrate:local` tetap hanya untuk database lokal.

`npm run build` menghasilkan Cloudflare Build Output di `.cloudflare/output`.
`npm run start` menjalankan preview build. Deployment produksi tidak dilakukan
sebagai bagian dari milestone 1–2.

Vite dipasang pada patch 8.3.8. Override `satori > fflate` ke patch 0.7.5
mengatasi advisory ZIP64 pada dependensi bawaan vinext tanpa mengganti framework.

`.env.example` mendokumentasikan konfigurasi build/CLI. `.dev.vars.example`
mencatat nama secret untuk integrasi Google pada milestone 3. Jangan memasukkan
secret ke source, konfigurasi publik, atau Git. Observability disiapkan dengan
redaksi query string; jangan mencatat flag, token, atau kredensial.
