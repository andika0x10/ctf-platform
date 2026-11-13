# CTF Platform

Ruang latihan CTF berkelanjutan berbasis tim. Antarmuka memakai Press Start 2P,
latar putih, ruang kosong luas, dan top navbar dengan mega menu.

Stack: vinext, React, TypeScript, Tailwind CSS, Cloudflare Workers, D1, dan Durable
Objects SQLite. Tidak ada binding R2, KV, atau Images. Lampiran challenge nantinya
berupa tautan unduhan.

## Status

Milestone 1–4 sudah diimplementasikan: fondasi penyimpanan, desain/navigasi,
autentikasi Google, nama tampilan, dua role, dan pengelolaan tim. Challenge,
pengiriman flag, skor, serta peringkat menyusul pada milestone berikutnya.
Lihat [daftar milestone](docs/MILESTONES.md) dan [panduan desain](docs/DESIGN.md).

Consent dan callback Google dengan akun sungguhan serta QA visual desktop/mobile
belum diverifikasi: browser automation tidak tersedia pada sesi implementasi.
Inisiasi OAuth, sesi, otorisasi, dan operasi tim telah diuji secara otomatis.

## Menjalankan lokal

Gunakan Node.js 22.18+ dan npm:

```sh
npm ci
npm run cf-typegen
npm run db:migrate:local
npm run auth:setup
```

`auth:setup` membuat `.dev.vars` bila belum ada, mengisi secret aplikasi acak bila
belum valid, dan mempertahankan konfigurasi Google yang sudah terisi. Nilai
secret tidak ditampilkan. `.dev.vars` diabaikan Git.

Isi konfigurasi Google di `.dev.vars`, lalu jalankan:

```sh
npm run dev -- --host localhost --port 5173 --strictPort
```

Buka `http://localhost:5173`. Gunakan host dan port yang sama dengan
`BETTER_AUTH_URL`, termasuk ketika menjalankan preview build. Data lokal CLI dan
Vite disimpan di `.cloudflare/state` dan tetap tersedia setelah restart.

## Google OAuth dan role

Di Google Cloud Console, buat OAuth client bertipe **Web application** dan
tambahkan authorized redirect URI:

```text
http://localhost:5173/api/auth/callback/google
```

Konfigurasi runtime:

| Nama | Penggunaan |
| --- | --- |
| `BETTER_AUTH_SECRET` | Secret acak aplikasi, minimal 32 karakter; dibuat oleh `auth:setup` |
| `BETTER_AUTH_URL` | Origin aplikasi, default lokal `http://localhost:5173` |
| `GOOGLE_CLIENT_ID` | OAuth Web client ID dari Google |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret dari Google |
| `ORGANIZER_EMAILS` | Email panitia dipisahkan koma, misalnya `panitia@example.com` |

Jika consent screen Google masih dalam mode testing, tambahkan akun yang akan
dipakai ke daftar test users pada proyek Google tersebut. Gunakan URL callback
produksi terpisah ketika menyiapkan domain produksi.

Role ditentukan server dari email Google terverifikasi dan allowlist, bukan
isian formulir atau localStorage. Hanya ada `participant` dan `organizer`;
pemilik tim merupakan hubungan kepemilikan. Perubahan allowlist berlaku pada
pemeriksaan akses berikutnya setelah konfigurasi runtime dimuat ulang.

Setelah masuk pertama kali, peserta/panitia memilih nama tampilan. Nama asli
dan foto Google tidak langsung menjadi profil publik. Email hanya tampil pada
akun pribadi. Data otorisasi dan status suspend diperiksa dari sesi D1 tanpa
cookie cache. Cookie sesi HttpOnly, SameSite=Lax, Secure untuk HTTPS; refresh
sesi ditangani SDK di browser agar rendering server tidak menulis cookie.

Tanpa konfigurasi OAuth yang lengkap, halaman publik tetap dapat dibuka dan
halaman login menjelaskan bahwa akses belum tersedia. Tidak ada login demo
atau endpoint yang melewati Google.

## Tim

- Satu peserta hanya memiliki satu keanggotaan aktif, dijaga primary key D1.
- Anggota tim tanpa batas; pemilik dapat membagikan kode acak 128-bit.
- Kode hanya dapat dilihat pemilik dan panitia. Kode lama tidak berlaku setelah rotasi.
- Pemilik dapat mengganti nama, mengeluarkan anggota, dan mengalihkan kepemilikan
  kepada anggota aktif. Anggota biasa dapat keluar dan pindah tim.
- Pemilik harus mengalihkan kepemilikan sebelum keluar. Pemilik terakhir dapat
  mengarsipkan tim. Panitia dapat membantu melalui `/admin/teams`.
- Arsip menutup keanggotaan/pengiriman baru dan melepaskan anggota aktif;
  catatan tim dan aktivitas dipertahankan. Riwayat tidak berpindah ketika anggota pindah.
- Nama tim tetap unik, termasuk nama tim yang diarsipkan.

Semua operasi terkait menggunakan transaksi batch D1. Otorisasi dan kondisi
keanggotaan diperiksa lagi dalam SQL pada transaksi yang menulis perubahan;
tidak ada transaksi yang dibagi antara D1 dan Durable Object.

## Endpoint aplikasi

| Endpoint | Fungsi |
| --- | --- |
| `/api/auth/*` | Handler Better Auth: Google OAuth, sesi, logout |
| `PATCH /api/profile` | Validasi nama tampilan dan penyelesaian onboarding |
| `GET /api/teams` | Tim peserta yang sedang masuk |
| `POST /api/teams` | Membuat tim |
| `POST /api/teams/join` | Bergabung menggunakan kode |
| `GET /api/teams/:id` | Detail untuk anggota tim atau panitia |
| `PATCH /api/teams/:id` | Aksi rename, rotate-invite, transfer-owner, remove-member, leave, archive |
| `GET /api/health` | Pemeriksaan koneksi D1 dan RPC Durable Object |

API profil/tim memakai JSON, respons `Cache-Control: no-store`, pemeriksaan Origin
untuk mutasi, validasi field, dan batas body 8 KiB. Field role, status suspend,
serta penyelesaian profil tidak dapat diatur klien lewat Better Auth.
Rate limit autentikasi memakai penyimpanan D1 dan header IP Cloudflare;
rate limit pengiriman flag memakai Durable Objects pada milestone 7.

## Pengujian

```sh
npm run typecheck
npm test
npm run build
```

Tes mencakup navigasi DOM serta integrasi Better Auth/D1 pada Miniflare terisolasi:
sesi palsu/kedaluwarsa/dicabut, suspend, CSRF, role, onboarding, privasi kode,
persaingan create/join, keunikan nama, rotasi kode, kepemilikan, dan arsip.
Tes integrasi tidak menggunakan database pengguna atau akun Google sungguhan.

Dengan dev server berjalan dan `.dev.vars` sudah diisi:

```sh
npm run check:foundation
npm run check:auth-teams
```

`check:foundation` menguji health D1/Durable Object, halaman, 404, dan font lokal.
`check:auth-teams` menguji HTML terautentikasi dan operasi tim melalui HTTP,
menggunakan identitas sementara pada **database lokal**, lalu membersihkannya.
Script menolak origin selain HTTP loopback dan selalu memakai `cf --local`.
Secret aplikasi dibaca hanya di proses pemeriksaan, tanpa dicetak atau dimasukkan
ke argumen CLI. Nilai fixture sementara disimpan dalam file yang diabaikan Git
dan dihapus setelah selesai. Script juga memeriksa URL/state Google tanpa
mengikuti consent Google atau menyamar sebagai akun Google di aplikasi.

Jika origin berbeda, tentukan `CHECK_ORIGIN`. Untuk pengujian OAuth runtime,
jalankan server pada origin yang sama dengan `BETTER_AUTH_URL`.

```powershell
$env:CHECK_ORIGIN = 'http://localhost:5173'
npm run check:auth-teams
```

## Migrasi dan struktur

- `0001_foundation.sql`: pengaturan platform dan kategori.
- `0002_auth.sql`: skema yang digenerasikan dari Better Auth 1.7.22.
- `0003_teams.sql`: tim, keanggotaan, aktivitas, dan constraint kepemilikan.

Migrasi dapat dijalankan ulang; hanya file yang belum tercatat yang diterapkan.
`npm run auth:schema` meregenerasikan **skema awal** 0002 dari database terisolasi
untuk pemeliharaan versi auth ini. Untuk mengubah skema yang sudah diterapkan,
tambahkan migrasi baru dan jangan menulis ulang migrasi yang sudah digunakan.

`lib/auth` menyediakan konfigurasi, factory per request, viewer, dan guard.
`lib/teams.ts` memusatkan aturan tim dan transaksi. `components` berisi UI bersama;
`worker.ts` meneruskan handler vinext serta mengekspor `ParticipantCoordinator`.
Durable Object menyiapkan penyimpanan SQLite dan health check; rate limit flag
diimplementasikan pada milestone 7.

Vite mematikan penemuan dependency RSC secara dinamis untuk menghindari invalidasi
modul Better Auth saat Cloudflare runner sedang memuatnya. Explicit includes
bawaan vinext tetap digunakan. Build produksi tidak menggunakan optimizer dev ini.

## Deployment

Konfigurasi memakai `cf`, bukan Wrangler. Regenerasikan tipe setelah perubahan
binding dengan `npm run cf-typegen`. `npm run build` menghasilkan Cloudflare Build
Output di `.cloudflare/output`; `npm run start` menjalankan preview build.

ID database fallback pada konfigurasi hanya mengidentifikasi simulasi lokal.
Sebelum deployment, tentukan `CLOUDFLARE_D1_DATABASE_ID` dengan database produksi,
gunakan `APP_ENV=production`, pasang secret runtime, tetapkan origin HTTPS pada
`BETTER_AUTH_URL`, daftarkan callback produksi di Google, dan terapkan migrasi
ke database tersebut. `db:migrate:local` tetap hanya menyentuh database lokal.
Deployment produksi tidak dilakukan sebagai bagian milestone 1–4.

Vite dipasang pada patch 8.3.8. Override `satori > fflate` ke 0.7.5 mengatasi
advisory ZIP64 pada dependency framework. Jangan mencatat flag, token, cookie,
atau kredensial dalam log; observability meredaksi query string.
