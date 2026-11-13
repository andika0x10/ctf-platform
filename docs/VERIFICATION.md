# Hasil verifikasi lokal

Diperiksa pada 13 November 2026, Windows 11, Node.js 26.12.1, npm 11.20.0,
vinext/Cloudflare Vite plugin yang terkunci dalam package-lock.json. Pemeriksaan
ini menggunakan runtime lokal workerd/Miniflare, bukan Worker produksi global.

## Pemeriksaan yang lulus

- TypeScript (`npm run typecheck`).
- 40 tes pada 11 file: navigasi DOM, interaksi flag/hint/polling, Better Auth,
  sesi palsu/kedaluwarsa/dicabut, CSRF, role, onboarding, tim, privasi undangan,
  authoring dan revisi challenge, Markdown, submit bersamaan, skor, peringkat,
  moderasi, pengumuman, pendaftaran, CSV, dan validasi konfigurasi produksi.
- Native RPC Durable Object SQLite: hanya 10 dari 12 percobaan serentak diterima,
  identitas lain terisolasi, dan batas tetap berlaku setelah runtime dihentikan
  lalu dibuat ulang dengan direktori persist yang sama.
- Submissions memeriksa ulang membership, akun yang baru disuspend dan revisi
  challenge yang berubah di antara validasi awal dan transaksi penulisan.
- Enam migrasi D1 diterapkan lokal, termasuk skema auth asli Better Auth 1.7.22.
- Build produksi lulus. Pesan klasifikasi route/sourcemap framework tidak fatal.
- Dry run deployment dengan konfigurasi produksi dummy lulus tanpa upload.
  Build output diperiksa untuk APP_ENV, ID D1, binding secret tanpa nilai, dan
  ekspor Durable Object SQLite. Build lokal kemudian dibuat ulang agar preview
  tetap memakai database simulasi lokal.
- Audit dependency: 0 kerentanan.
- Cold start dev dengan `--force`, health, SSR dan API nyata lulus.
- Preview build produksi: health, halaman publik/privat, status 404, font lokal,
  header keamanan, role, onboarding, create/join/transfer/leave/archive tim,
  logout, URL/state OAuth, challenge, hint, pengiriman, peringkat, profil,
  admin SSR, pengumuman, settings, CSV, rate limit dan suspend lulus melalui HTTP.
- Timestamp inisialisasi DO health sama pada dev dan preview:
  `2026-11-13T07:09:55.965Z`.
- Pemeriksaan akhir D1 setelah cleanup mengembalikan nol fixture pada users,
  teams, challenges, submissions dan announcements. Tidak ada akun asli yang
  ditimpa oleh script pemeriksaan. State limiter untuk UUID fixture tetap lokal.

## Simulasi 100 peserta

Script `npm run check:platform` membuat 50 tim berisi dua peserta dan satu
challenge dengan 500 poin awal, 100 minimum, decay 50. Setelah setup, 100 request
flag benar dikirim bersamaan melalui HTTP dengan sesi berbeda. Pengukuran
dimulai saat fetch dan selesai setelah JSON response dibaca, tanpa waktu setup.

| Runtime lokal | Request | Solve | Sudah selesai | Error | Durasi burst | P50 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dev | 100 | 50 | 50 | 0 | 3.028 ms | 3.010 ms | 3.019 ms |
| Preview build produksi | 100 | 50 | 50 | 0 | 3.229 ms | 2.317 ms | 3.216 ms |

D1 berisi tepat 50 solve dan 100 submission setelah burst; setiap tim mendapat
100 poin dan satu solve. Skor dicek melalui API peringkat. Angka waktu memakai
pemisah ribuan Indonesia. Ini satu burst per runtime pada satu mesin, bukan
benchmark berulang, uji beban berjam-jam, atau jaminan kapasitas deployment.
Hasil mentah tersimpan di `.cloudflare/load-dev.json` dan `load-preview.json`.

## Batas verifikasi

- Browser inventory mengembalikan `apps: []`, `browsers: []`. Screenshot, layout
  desktop/mobile, flow interaktif browser lengkap dan penilaian visual belum
  dijalankan. Tes DOM tidak menggantikan QA rendering browser.
- Google OAuth initiation dan state diperiksa, tetapi consent/callback dengan
  akun Google sungguhan belum diselesaikan. Kebenaran kredensial dan konfigurasi
  consent Google perlu diverifikasi melalui browser.
- Tidak ada D1 remote, domain produksi, secret remote, atau versi Worker yang
  dibuat/diunggah. Panduan deployment dan validasi lokal disediakan; koneksi
  produksi serta latensi jaringan global belum diukur.
