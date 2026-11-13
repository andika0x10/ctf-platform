# Deployment dan operasional

Konfigurasi proyek memakai Cloudflare `cf`, D1 dan Durable Objects SQLite.
Perintah berikut merujuk CLI terkunci 1.0.0-beta.31. Periksa bantuan CLI ketika
meningkatkan versinya; semua langkah di sini disiapkan tanpa deployment nyata.

## Persiapan

1. Siapkan akun Cloudflare dan autentikasi `cf` (`cf auth login`, atau API token
   dengan izin yang sesuai di CI).
2. Buat D1 produksi terpisah dari simulasi lokal:

   ```sh
   npx cf d1 create --name ctf-platform-db --primary-location-hint apac
   ```

3. Salin `.env.production.example` menjadi `.env.production` yang diabaikan Git.
   Isi ID database dari langkah sebelumnya, `APP_ENV=production`, origin HTTPS,
   Google OAuth, email panitia, dan dua secret acak berbeda minimal 32 karakter.
   Secret dapat dibuat dengan `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`;
   jalankan sendiri di terminal privat dan simpan langsung di pengelola secret.
4. Daftarkan callback Google produksi tepat pada
   `https://DOMAIN/api/auth/callback/google`. Pastikan origin/domain konsisten
   dengan rute Worker yang dipakai. Konfigurasi Google consent dan akun testing
   perlu diperiksa melalui akun Google sungguhan.
5. Terapkan migrasi pada **ID produksi yang sudah diverifikasi**:

   ```sh
   npx cf d1 migrations list DATABASE_ID --dir migrations
   npx cf d1 migrations apply DATABASE_ID --dir migrations
   ```

   Perintah di atas menyentuh remote karena tidak memakai `--local`.
   `npm run db:migrate:local` tetap khusus database lokal.

## Build dan upload

```sh
npm ci
npm run cf-typegen
npm run typecheck
npm test
npm run check:deploy
npm run deploy -- --dry-run
```

Pemeriksaan menolak ID fallback lokal, origin yang bukan HTTPS, allowlist kosong,
secret pendek, dan penggunaan secret sesi yang sama dengan secret flag. Nilai
environment proses mengalahkan `.env.production`, sehingga dapat dipakai oleh CI.
Dry run hanya membangun dan tidak memanggil upload maupun provisioning remote.

Setelah hasil build diperiksa, jalankan:

```sh
npm run deploy
```

Script membangun ulang dengan ID D1 dan APP_ENV produksi, lalu memakai
`cf deploy --prebuilt --secrets-file FILE_JSON_SEMENTARA`. File berisi hanya enam
binding secret yang dideklarasikan; file berada di `.cloudflare` dan dihapus
setelah proses selesai. Secret tidak dimasukkan ke command line. `.dev.vars`
khusus pengembangan dan tidak menjadi sumber konfigurasi script deployment.
Jangan memakai perintah fixture `check:platform` pada domain produksi.

Worker mengekspor `ParticipantCoordinator` dengan penyimpanan SQLite; namespace
diikat pada Worker yang sama. Tidak perlu membuat R2/KV atau layanan berkas.
Konfigurasi/rute domain tambahan disesuaikan pada `cloudflare.config.ts` sebelum
build. Aplikasi tidak menjalankan layanan target challenge; sediakan target dan
file pendukung di luar platform.

## Pemeriksaan setelah deployment

- `/api/health` mengembalikan status D1 dan Durable Object `ok`.
- Login Google sampai consent/callback, onboarding nama, logout, dan login ulang.
- Satu akun allowlist melihat menu panitia; akun peserta ditolak oleh URL/API panitia.
- Buat tim, bergabung dari akun lain, terbitkan challenge uji, buka hint, kirim
  flag salah/benar, dan periksa profil serta peringkat dari dua akun.
- Periksa navbar, form, tabel, pagination dan fokus keyboard di desktop/mobile.
- Periksa cookie Secure/HttpOnly/SameSite, HTML privat tanpa cache publik, dan
  tanpa flag/token/kredensial pada log. Periksa penggunaan D1/DO dan error rate.

## Pemeliharaan, backup dan pemulihan

- Simpan backup/export D1 dan titik pemulihan sebelum migrasi atau perubahan
  operasional besar; gunakan fasilitas backup/Time Travel D1 sesuai akun. Catat
  ID database, versi Worker, dan nomor migrasi. Uji pemulihan pada database terpisah.
- Migrasi ditambahkan ke depan. Jangan mengedit migrasi yang sudah diterapkan;
  jangan menghapus tabel untuk rollback aplikasi. Rollback Worker hanya jika
  versi lama kompatibel dengan skema yang sekarang.
- Pertahankan `FLAG_SIGNING_SECRET`. Jika harus diganti, tutup akses pengiriman
  sementara dan masukkan ulang flag semua challenge menggunakan secret baru.
  Digest lama tidak dapat diubah kembali menjadi flag. Rotasi secret sesi
  mengharuskan semua pengguna masuk ulang.
- Suspend mencabut sesi tetapi mempertahankan tim, solve dan atribusi. Aktifkan
  kembali tidak menghidupkan sesi lama. Perubahan allowlist memerlukan pembaruan
  konfigurasi runtime. Akun panitia dikelola melalui allowlist, bukan moderasi UI.
- Hapus challenge/tim secara permanen beserta solve dan submissions terkait.
  Penghapusan menghitung ulang peringkat; pastikan migrasi cascade sudah diterapkan.
  Pembuat dapat keluar tim dengan pengalihan pemilik otomatis ke anggota terlama.
  Tim dihapus jika anggota terakhir keluar.
- Ekspor CSV dibatasi eksplisit sampai 10.000 tim; jangan menganggap CSV sebagai
  backup database lengkap. Riwayat pengiriman disimpan tanpa jawaban plaintext.
- Gunakan observability dengan query string teredaksi. Jangan menambahkan
  logging body submission, cookie, header authorization, atau environment secret.

Hasil load test lokal bukan jaminan kapasitas global. Setelah deploy, pantau
latensi, error dan penggunaan D1/DO pada beban nyata sebelum membuka latihan luas.
