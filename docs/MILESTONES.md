# Milestone

| # | Hasil | Status |
| --- | --- | --- |
| 1 | Fondasi vinext, D1, Durable Object SQLite, migrasi, tipe binding, health check | Diimplementasikan dan diverifikasi lokal |
| 2 | Font pixel lokal, token desain, beranda/aturan, layout dan mega menu responsif | Diimplementasikan; QA visual browser masih perlu dilakukan |
| 3 | Google login, sesi, dua role, nama tampilan | Diimplementasikan; sesi, guard, dan inisiasi OAuth terverifikasi; consent/callback Google nyata perlu browser |
| 4 | Pembuatan dan pengelolaan tim | Diimplementasikan dan diverifikasi pada D1 serta HTTP lokal; QA visual browser belum tersedia |
| 5 | Pengelolaan challenge oleh panitia | Belum dikerjakan |
| 6 | Daftar/detail challenge dan pengalaman peserta | Belum dikerjakan |
| 7 | Validasi flag, skor dinamis, rate limit | Belum dikerjakan |
| 8 | Peringkat, profil tim, riwayat | Belum dikerjakan |
| 9 | Operasional panitia, pengumuman, pengaturan | Belum dikerjakan |
| 10 | Pengujian menyeluruh dan kesiapan deploy | Belum dikerjakan |

Halaman challenges, peringkat, dan pengumuman masih berupa state awal. Halaman
login, akun, tim, dan pengelolaan tim panitia kini menggunakan backend nyata.
Tidak ada challenge atau skor buatan yang ditampilkan sebagai data nyata.

Migrasi 0001 berisi pengaturan dan kategori. Migrasi 0002 dihasilkan dari skema
Better Auth 1.7.22, sedangkan 0003 menyimpan tim, keanggotaan, dan aktivitas.
Challenge dan pengiriman akan ditambahkan pada milestone terkait.

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
