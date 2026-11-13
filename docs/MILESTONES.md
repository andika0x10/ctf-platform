# Milestone

| # | Hasil | Status |
| --- | --- | --- |
| 1 | Fondasi vinext, D1, Durable Object SQLite, migrasi, tipe binding, health check | Diimplementasikan dan diverifikasi lokal |
| 2 | Font pixel lokal, token desain, beranda/aturan, layout dan mega menu responsif | Diimplementasikan; QA visual browser masih perlu dilakukan |
| 3 | Google login, sesi, dua role, nama tampilan | Diimplementasikan; sesi, guard, dan inisiasi OAuth terverifikasi; consent/callback Google nyata perlu browser |
| 4 | Pembuatan dan pengelolaan tim | Diimplementasikan dan diverifikasi pada D1 serta HTTP lokal; QA visual browser belum tersedia |
| 5 | Pengelolaan challenge oleh panitia | Selesai; TypeScript, 26 tes, migrasi lokal, dan build lulus |
| 6 | Daftar/detail challenge dan pengalaman peserta | Selesai; TypeScript, 27 tes, dan build lulus |
| 7 | Validasi flag, skor dinamis, rate limit | Selesai; 32 tes termasuk RPC/restart DO, migrasi, TypeScript, dan build lulus |
| 8 | Peringkat, profil tim, riwayat | Selesai; TypeScript, 33 tes, dan build lulus |
| 9 | Operasional panitia, pengumuman, pengaturan | Selesai; TypeScript, 35 tes, migrasi lokal, dan build lulus |
| 10 | Pengujian menyeluruh dan kesiapan deploy | Belum dikerjakan |

Halaman peserta, peringkat, riwayat, dan operasional panitia menggunakan backend
nyata. Tidak ada challenge atau skor buatan yang ditampilkan sebagai data nyata.

Migrasi 0001 berisi pengaturan dan kategori. Migrasi 0002 dihasilkan dari skema
Better Auth 1.7.22, sedangkan 0003 menyimpan tim, keanggotaan, dan aktivitas.
Migrasi 0004 menambahkan challenge dengan kontrol revisi dan digest flag.
Migrasi 0005 mencatat pengiriman/solve; 0006 memuat pengumuman dan aturan.

## Verifikasi implementasi 1–2

- TypeScript, tujuh tes DOM navigasi, dan build produksi lulus.
- Migrasi lokal berhasil diterapkan dan dapat dijalankan ulang tanpa perubahan.
- Health check D1 dan RPC Durable Object lulus pada dev serta preview build produksi.
- Lima permintaan health bersamaan lulus.
- Timestamp inisialisasi Durable Object tetap sama setelah dev server dimulai ulang
  dan saat diakses melalui preview build produksi.
- Halaman bersama, HTTP 404, dan file font lokal terverifikasi lewat HTTP.
- Audit dependency melaporkan nol kerentanan.
- Screenshot, rendering pada ukuran layar berbeda, dan interaksi browser belum
  diverifikasi karena browser automation tidak tersedia pada sesi ini.

## Implementasi 3–4

- Google OAuth dengan email terverifikasi, cookie HttpOnly, sesi D1, logout,
  onboarding nama tampilan, dan penyegaran sesi di browser.
- Role dihitung server dari email terverifikasi dan allowlist lingkungan;
  klien tidak dapat mengubah role atau menandai profilnya selesai sendiri.
- Nama asli/foto dari Google tidak langsung menjadi profil publik.
- Tim mandiri dengan kode acak, tanpa batas anggota, satu tim aktif per peserta.
- Pemilik/panitia dapat mengganti nama/kode, mengeluarkan anggota, dan mengalihkan
  kepemilikan. Anggota dapat keluar dan berpindah tim.
- Pemilik terakhir dapat mengarsipkan tim; panitia dapat mengarsipkan tim beranggota.
  Catatan tim dan aktivitas dipertahankan, keanggotaan aktif dilepaskan.
- Penulisan tim dilakukan dalam transaksi D1 dengan pemeriksaan otorisasi di SQL.
- Tes mencakup sesi palsu/kedaluwarsa/dicabut, suspend, CSRF, onboarding, privasi
  kode/email, persaingan create/join, rotasi kode, pemilik, dan arsip.
- QA HTTP memakai identitas sementara pada database lokal dan membersihkannya.
  Tidak ada endpoint login khusus pengujian di aplikasi.
- Login melalui akun Google sungguhan hingga selesai consent/callback serta
  screenshot desktop/mobile belum diverifikasi karena browser tidak tersedia.

Verifikasi akhir: TypeScript, 23 tes, audit dependency (0 kerentanan), dan build
produksi lulus. `check:auth-teams` lulus pada dev server dan preview build
produksi, termasuk larangan cache publik untuk HTML terautentikasi. Fixture
pengujian dibersihkan dari database lokal setelah pemeriksaan.

## Implementasi 5

- Editor panitia: kategori, kesulitan, Markdown aman beserta pratinjau, hint,
  target, tautan berkas HTTPS, skor, draft/terbit/arsip, dan penggantian flag.
- Flag menggunakan HMAC SHA-256 yang terikat pada ID challenge; plaintext
  dan digest tidak dikembalikan melalui API editor. `FLAG_SIGNING_SECRET`
  dibuat oleh `npm run auth:setup`; pertahankan nilainya setelah challenge dibuat.
- Kontrol revisi menolak penyimpanan dari editor lama. API memeriksa sesi,
  role panitia, onboarding, origin, ukuran badan, dan semua field masukan.
- TypeScript, 26 tes, migrasi lokal, dan build produksi lulus. QA visual
  browser tetap belum tersedia.

## Implementasi 6

- Daftar challenge dengan pencarian, kategori, pagination 50 item, serta detail
  Markdown, target, unduhan eksternal, dan hint gratis yang dibuka sesuai kebutuhan.
- Query peserta memilih field yang aman dan hanya status terbit. Draft/arsip
  tidak tersedia melalui detail maupun endpoint hint. Hint memerlukan sesi.
- Peserta tanpa tim tetap dapat membaca challenge dan diarahkan ke pengelolaan tim.
- TypeScript, 27 tes, dan build produksi lulus.

## Implementasi 7

- Flag divalidasi dengan Web Crypto tanpa menyimpan jawaban pada riwayat.
- D1 batch memeriksa ulang identitas, membership, status, dan revisi challenge;
  unique constraint memastikan satu solve per tim/challenge saat pengiriman bersamaan.
- Skor parabola dihitung dari seluruh solve, termasuk tim/soal arsip. Nilai tim
  yang sudah solve menyesuaikan bersama; hint tidak mengurangi poin.
- Sepuluh percobaan per peserta/challenge/menit disimpan dalam SQLite Durable
  Object. HTTP 429 memiliki Retry-After. Uji panitia tidak menghasilkan solve.
- Challenge yang sudah memiliki solve dapat diarsipkan, tetapi tidak dikembalikan
  menjadi draft. Riwayat dan atribusi tim lama dipertahankan saat anggota pindah.
- 32 tes lulus, termasuk RPC DO nyata, pengiriman bersamaan dan pemulihan limiter
  setelah restart runtime; TypeScript, migrasi lokal, dan build produksi lulus.

## Implementasi 8

- Peringkat publik dan profil tim memakai agregasi skor yang sama. Tim dan
  challenge arsip mempertahankan solve serta pengaruhnya pada skor dinamis.
- Tie-break: skor menurun, waktu solve terakhir menaik, ID tim menaik.
- Polling halaman setiap 30 detik, hanya ketika tab terlihat. API tidak dicache.
- Profil publik hanya memuat nama anggota/solver dan progres, tanpa email/kode.
- Riwayat pribadi serta riwayat pengiriman tim memerlukan sesi; hasil dan
  atribusi tim asli dipertahankan. Daftar/riwayat menggunakan pagination 50 item.
- TypeScript, 33 tes, dan build produksi lulus.

## Implementasi 9

- Ringkasan panitia menampilkan hitungan nyata dan aktivitas pengiriman terbaru.
- Pencarian akun dan riwayat pengiriman dengan filter nama challenge/tim/peserta,
  hasil, serta konteks akun/tim/challenge. Semua daftar menggunakan pagination.
- Suspend mencabut seluruh sesi peserta. Aktifkan kembali tidak menghidupkan
  sesi lama. Moderasi peserta tidak dapat mengubah akun panitia.
- Pengumuman Markdown dengan revisi, draft/terbit/arsip; halaman publik hanya
  membaca yang terbit. Nama platform, aturan dan pendaftaran dapat diatur panitia.
- Penutupan pendaftaran berlaku pada hook penciptaan akun Google baru, sementara
  akun yang sudah ada tetap dapat masuk.
- Ekspor CSV peringkat hanya untuk panitia, tanpa email/kode/flag, dengan escaping
  formula spreadsheet dan batas eksplisit 10.000 tim.
- TypeScript, 35 tes, migrasi lokal, dan build produksi lulus.
