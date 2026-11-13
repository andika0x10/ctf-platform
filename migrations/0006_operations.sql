CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','published','archived')),
  revision INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES "user"(id),
  updated_by TEXT NOT NULL REFERENCES "user"(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX announcements_status_time ON announcements(status,created_at DESC);
INSERT INTO platform_settings(key,value) VALUES ('rules_markdown', '## Bermain bersama tim

Gunakan akunmu sendiri dan bergabung dalam satu tim. Setiap solve menjadi pencapaian tim tempat kamu mengirim flag.

## Uji hanya target challenge

Lakukan pengujian pada berkas dan layanan yang disebutkan dalam soal. Infrastruktur platform dan akun peserta lain berada di luar target latihan.

## Jaga ruang untuk belajar

Diskusikan pendekatan bersama timmu. Hindari menyebarkan flag agar peserta lain tetap punya kesempatan menemukan jawabannya.

## Pahami skor dinamis

Nilai challenge turun seiring bertambahnya tim yang menyelesaikannya, sampai mencapai nilai minimum. Perubahan berlaku untuk seluruh tim yang sudah solve.

## Gunakan hint saat perlu

Hint tersedia secara gratis jika disediakan panitia. Membukanya tidak mengurangi skor tim.

## Hormati peserta lain

Belajar berlangsung dengan ritme yang berbeda. Bantu menjaga diskusi yang terbuka, ramah, dan saling menghargai.');
