# Milestone

| # | Hasil | Status |
| --- | --- | --- |
| 1 | Fondasi vinext, D1, Durable Object SQLite, migrasi, tipe binding, health check | Diimplementasikan dan diverifikasi lokal |
| 2 | Font pixel lokal, token desain, beranda/aturan, layout dan mega menu responsif | Diimplementasikan; QA visual browser masih perlu dilakukan |
| 3 | Google login, sesi, dua role, nama tampilan | Belum dikerjakan |
| 4 | Pembuatan dan pengelolaan tim | Belum dikerjakan |
| 5 | Pengelolaan challenge oleh panitia | Belum dikerjakan |
| 6 | Daftar/detail challenge dan pengalaman peserta | Belum dikerjakan |
| 7 | Validasi flag, skor dinamis, rate limit | Belum dikerjakan |
| 8 | Peringkat, profil tim, riwayat | Belum dikerjakan |
| 9 | Operasional panitia, pengumuman, pengaturan | Belum dikerjakan |
| 10 | Pengujian menyeluruh dan kesiapan deploy | Belum dikerjakan |

Halaman challenges, peringkat, tim, akun, login, dan pengumuman saat ini hanya
menyediakan state awal untuk navigasi. Tidak ada akun, skor, atau challenge
buatan yang ditampilkan sebagai data nyata. Tombol Google belum diaktifkan.

Database awal hanya berisi pengaturan platform dan kategori. Skema autentikasi,
tim, challenge, serta pengiriman ditambahkan dalam migrasi milestone terkait,
agar tidak menduplikasi skema Better Auth sebelum integrasi autentikasi.

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
