# CTF Platform

Ruang latihan Jeopardy CTF berkelanjutan berbasis tim, dengan dua role: peserta
dan panitia. UI berbahasa Indonesia memakai Press Start 2P lokal, warna putih,
ruang kosong luas, dan top navbar dengan mega menu di seluruh halaman.

Stack: vinext, React, TypeScript, Cloudflare Workers, D1, dan Durable Objects
SQLite. Lampiran berupa tautan HTTPS eksternal; tidak ada upload, R2, atau KV.

Milestone 1–10 sudah diimplementasikan dan di-commit. Lihat
[milestone](docs/MILESTONES.md), [desain](docs/DESIGN.md),
[hasil verifikasi](docs/VERIFICATION.md), dan [deployment](docs/DEPLOYMENT.md).
Consent/callback Google sungguhan serta QA visual desktop/mobile masih perlu
pemeriksaan browser; browser automation tidak tersedia pada sesi implementasi.

## Menjalankan lokal

Gunakan Node.js 22.18+ dan npm. Versi dependency terkunci di package-lock.json.

```sh
npm ci
npm run cf-typegen
npm run db:migrate:local
npm run auth:setup
```

`auth:setup` membuat `.dev.vars` dan dua secret acak jika belum valid, sambil
mempertahankan konfigurasi Google yang sudah terisi. Nilai secret tidak dicetak.
Isi Google OAuth dan email panitia dalam file tersebut, lalu jalankan:

```sh
npm run dev -- --host localhost --port 5173 --strictPort
```

Buka `http://localhost:5173`. Data lokal CLI dan Vite berbagi
`.cloudflare/state`, tetap tersedia setelah restart. `.dev.vars` diabaikan Git.

Daftarkan Google OAuth Web client redirect URI:

```text
http://localhost:5173/api/auth/callback/google
```

Jika consent screen masih testing, akun Google perlu berada dalam daftar test
users. Gunakan origin yang sama dengan `BETTER_AUTH_URL`, termasuk saat preview.

| Konfigurasi | Kegunaan |
| --- | --- |
| `BETTER_AUTH_URL` | Origin aplikasi, lokal `http://localhost:5173` |
| `BETTER_AUTH_SECRET` | Secret sesi minimal 32 karakter acak |
| `FLAG_SIGNING_SECRET` | Secret berbeda untuk digest flag, minimal 32 karakter acak |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ORGANIZER_EMAILS` | Email panitia terverifikasi, dipisahkan koma |

Pertahankan `FLAG_SIGNING_SECRET` setelah membuat challenge. Rotasi tanpa
memasukkan ulang seluruh flag membuat flag lama tidak dapat divalidasi.
Tidak ada endpoint login demo atau cara masuk yang melewati Google.

## Fitur dan aturan

- Google login, sesi HttpOnly, SameSite=Lax dan Secure pada HTTPS; onboarding
  nama tampilan. Nama/foto asli Google tidak langsung menjadi profil publik.
- Role dihitung server dari email terverifikasi dan allowlist. Pemilik tim
  merupakan hubungan kepemilikan, bukan role ketiga.
- Satu keanggotaan aktif per peserta, anggota tanpa batas, kode acak 128-bit
  yang hanya terlihat oleh pemilik/panitia. Rotasi kode, transfer pemilik,
  keluarkan anggota, keluar/pindah, dan arsip tersedia.
- Pemilik harus mengalihkan kepemilikan sebelum keluar. Pemilik terakhir dapat
  mengarsipkan tim; panitia dapat membantu tim beranggota melalui `/admin/teams`.
- Arsip melepas anggota aktif dan menutup pengiriman baru. Solve dan skor tetap
  menjadi milik tim lama ketika anggota pindah; nama tim arsip tetap dicadangkan.
- Editor challenge: kategori, kesulitan, Markdown aman, target, hint gratis,
  tautan unduhan, pengaturan skor, flag, serta draft/terbit/arsip. Konflik revisi
  ditolak. Challenge yang sudah dimainkan tidak dapat dikembalikan menjadi draft.
- Peserta dapat mencari dan memfilter challenge menurut kategori/progres,
  membaca detail, membuka hint, dan mengirim flag setelah bergabung dengan tim.
- Flag case-sensitive setelah trim; disimpan sebagai HMAC SHA-256 terikat ID
  challenge. Jawaban tidak disimpan pada riwayat atau log. Uji flag panitia
  tidak menghasilkan solve/pengiriman peserta.
- Rate limit: 10 percobaan per peserta/challenge dalam jendela 60 detik, disimpan
  pada Durable Object SQLite per peserta. Respons 429 menyertakan Retry-After.
- Penulisan submission/solve bersifat atomik di D1, termasuk pemeriksaan ulang
  membership, status akun, status/revisi challenge, serta satu solve per tim.
- Peringkat dan profil tim publik, riwayat pribadi dan tim, polling 30 detik
  ketika tab terlihat, pagination, serta ekspor peringkat CSV oleh panitia.
- Ringkasan panitia, pencarian akun/pengiriman, suspend dengan pencabutan seluruh
  sesi, pengumuman Markdown, nama platform, aturan, dan buka/tutup pendaftaran.

Skor challenge untuk `n` tim yang sudah solve:

```text
n >= decay: minimum
n < decay: initial - floor((initial - minimum) * n² / decay²)
```

Default: initial 500, minimum 100, decay 50. Semua tim yang sudah solve mendapat
nilai saat ini yang sama. Solve tim/soal arsip tetap dihitung. Mengubah parameter
challenge menghitung ulang skor seluruh tim. Tie-break peringkat: skor menurun,
waktu solve terakhir lebih awal, lalu ID tim. Tim tanpa solve diurutkan ID.

## Halaman

| Akses | Halaman |
| --- | --- |
| Publik | `/`, `/rules`, `/scoreboard`, `/teams/:id`, `/announcements`, `/login` |
| Akun | `/account` termasuk riwayat pribadi |
| Peserta/panitia dengan profil lengkap | `/challenges`, `/challenges/:id` |
| Peserta | `/team`, `/team/history` |
| Panitia | `/admin`, `/admin/challenges`, `/admin/challenges/new`, `/admin/challenges/:id` |
| Panitia | `/admin/teams`, `/admin/teams/:id`, `/admin/participants`, `/admin/submissions` |
| Panitia | `/admin/announcements`, `/admin/announcements/new`, `/admin/announcements/:id`, `/admin/settings` |

Halaman akun/panitia tidak dicache publik. Semua mutasi aplikasi memeriksa sesi,
role, origin, field masukan, dan batas badan JSON (8 KiB; editor/settings 128 KiB).
Email hanya terlihat di akun pribadi dan daftar akun panitia. Profil tim serta
CSV tidak memuat email, kode undangan, ataupun flag. HTML mentah dan gambar
Markdown dinonaktifkan; CSV menangani escaping formula spreadsheet.

## Pengujian

```sh
npm run typecheck
npm test
npm run build
npm audit --audit-level=low
```

Tes menggunakan DOM serta D1 dan RPC Durable Object nyata dalam Miniflare
terisolasi. Suite mencakup sesi, CSRF, role, balapan membership/pengiriman,
perubahan akun/challenge saat submission, skor, privasi, moderasi, dan pemulihan
limiter setelah restart.

Dengan server dev atau preview berjalan pada origin lokal yang dikonfigurasi:

```sh
npm run check:foundation
npm run check:auth-teams
npm run check:platform
```

`check:platform` membuat 100 identitas lokal dan 50 tim sementara, mengirim flag
bersamaan, memeriksa alur panitia/peserta, lalu membersihkan fixture D1. Dibutuhkan
satu email yang belum terdaftar pada allowlist **lokal** untuk fixture panitia;
script tidak menyamar sebagai akun yang sudah ada. Secret dibaca dalam proses,
bukan dicetak atau dikirim lewat argumen CLI. Semua SQL fixture memakai `--local`
dan UUID yang dimiliki pemeriksaan. Script menolak origin selain HTTP loopback.
Objek limiter lokal untuk UUID fixture dapat tetap berada dalam state lokal.

Untuk preview:

```sh
npm run build
npm run start -- --host localhost --port 5173 --strictPort
```

`CHECK_ORIGIN` dapat mengganti origin pemeriksaan. Metrik simulasi tersimpan di
`.cloudflare/load-dev.json` atau `load-preview.json` jika `CHECK_LABEL=preview`.
Inisiasi OAuth diperiksa tanpa mengikuti consent Google.

## Struktur dan deployment

Migrasi 0001: settings/kategori; 0002: Better Auth; 0003: tim; 0004: challenge;
0005: submissions/solves; 0006: pengumuman/aturan. Migrasi hanya diterapkan sekali.
Untuk perubahan skema, tambahkan migrasi baru. `auth:schema` hanya meregenerasikan
skema awal Better Auth 1.7.22 pada database terisolasi, bukan upgrade database.

`lib/auth`, `lib/teams.ts`, `lib/challenges.ts`, `lib/submissions.ts`,
`lib/scoring.ts`, `lib/standings.ts`, dan `lib/operations.ts` memusatkan aturan.
`worker.ts` meneruskan handler vinext, menambahkan header keamanan, dan
mengekspor Durable Object. Binding types dihasilkan oleh `cf-typegen`.

Vite mematikan penemuan dependency RSC secara dinamis untuk menghindari
invalidasi modul Better Auth saat cold start; explicit includes vinext tetap
dipakai. Build produksi tidak memakai optimizer dev ini. Build menghasilkan
Cloudflare Build Output di `.cloudflare/output`.

Deployment memakai `cf` dengan validasi produksi. Isi `.env.production` mengikuti
contoh, lalu ikuti [panduan deployment](docs/DEPLOYMENT.md). `npm run check:deploy`
memeriksa konfigurasi; `npm run deploy -- --dry-run` memvalidasi dan membangun
tanpa upload. `npm run deploy` membangun ulang dengan konfigurasi produksi dan
mengunggah lewat `cf deploy --prebuilt`. Tidak ada deployment produksi yang
dilakukan pada sesi implementasi ini.
