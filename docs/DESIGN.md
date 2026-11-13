# Sistem desain

## Arah

Ruang latihan CTF yang putih dan lapang. Press Start 2P menjadi identitas utama;
ilustrasi flag berbasis SVG menghubungkan tampilannya dengan pencarian flag.
Konten rata kiri dan informasi tidak dipecah menjadi deretan kartu statistik.

| Token | Nilai |
| --- | --- |
| `--font-pixel` | Press Start 2P, monospace |
| `--color-paper` | `#FFFFFF` |
| `--color-surface` | `#FAFAFA` |
| `--color-line` | `#E5E5E5` |
| `--color-muted` | `#666666` |
| `--color-ink` | `#171717` |
| `--color-accent` | `#000000` |

Font menggunakan bobot asli 400, disimpan di `public/fonts/press-start-2p`
bersama lisensi SIL OFL. Fallback tidak menggunakan Geist. Ukuran teks
disesuaikan dengan lebar karakter pixel; konten utama menggunakan line-height
yang lapang. Angka hanya dipakai untuk urutan langkah bermain.

## Layout dan komponen

- `.shell`: konten maksimum 1200px, gutter desktop 40px dan mobile 20px.
- `.button`, `.button-outline`, `.text-link`: aksi utama, sekunder, dan tautan.
- `SiteHeader`: navbar yang sama untuk semua halaman, tanpa sidebar.
- Mega menu putih selebar header, dengan daftar tautan vertikal berkelompok.
- Satu kelompok terbuka pada satu waktu; klik di luar, tautan, atau Escape menutupnya.
- Escape mengembalikan fokus ke pemicu. Tab memakai urutan tautan HTML biasa.
- Di bawah 768px, tombol Menu membuka navigasi dan kelompok menjadi accordion.
- Kelompok Panitia tersedia jika `SiteHeader` menerima role `organizer` dari server.
  Root layout membaca viewer dari sesi D1 dan meneruskan role hasil pemeriksaan
  server. Jangan mengambil role dari URL atau localStorage.
- Gunakan disclosure buttons dengan `aria-expanded`/`aria-controls`, bukan ARIA
  menu untuk navigasi situs. Link halaman aktif memakai `aria-current`.
- Skip link, fokus keyboard, bahasa dokumen Indonesia, dan reduced motion disediakan.

## Pemeriksaan visual yang perlu dilakukan

Pada 320px, 390px, 768px, dan 1440px: periksa pembungkusan navbar dan judul,
ketajaman font, panel menu, fokus keyboard, serta overflow horizontal.
Browser automation tidak tersedia pada sesi implementasi awal; screenshot
dan pengujian interaksi browser belum dilakukan.

Tujuh pengujian DOM komponen navigasi tersedia melalui `npm test`. Pengujian
ini mencakup perilaku disclosure dan role; ukuran layar serta rendering font
tetap perlu diperiksa dalam browser.
