import Link from "next/link";
import { ArrowIcon, CategoryIcon, PixelFlag } from "@/components/pixel-icons";

const categories = [
  { slug: "web", name: "Web", description: "Celah di balik halaman." },
  { slug: "crypto", name: "Crypto", description: "Pesan di balik sandi." },
  { slug: "forensics", name: "Forensics", description: "Jejak di dalam data." },
  { slug: "reverse", name: "Reverse", description: "Logika di balik program." },
  { slug: "misc", name: "Misc", description: "Di luar dugaanmu." },
];

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1}>
      <section className="shell hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="hero-intro"><span className="status-square" aria-hidden="true" />Ruang latihan Capture the Flag</p>
          <h1 id="hero-title">Cari celah.<br />Temukan flag.</h1>
          <p className="hero-description">Ikuti rasa ingin tahumu. Selesaikan challenge keamanan siber bersama tim, dengan ritmemu sendiri.</p>
          <div className="hero-actions">
            <Link href="/challenges" className="button">Lihat challenges<ArrowIcon /></Link>
            <a href="#cara-bermain" className="text-link">Cara bermain</a>
          </div>
          <p className="hero-note">Berbasis tim. Tanpa batas waktu.</p>
        </div>
        <figure className="flag-figure" aria-label="Ilustrasi flag CTF bermotif kotak-kotak">
          <div className="flag-canvas">
            <span className="canvas-corner corner-tl" aria-hidden="true" />
            <span className="canvas-corner corner-tr" aria-hidden="true" />
            <PixelFlag className="hero-flag" width="192" height="192" />
            <span className="canvas-corner corner-bl" aria-hidden="true" />
            <span className="canvas-corner corner-br" aria-hidden="true" />
          </div>
          <figcaption>CTF&#123;keep_learning&#125;</figcaption>
        </figure>
      </section>
      <section className="category-section" aria-labelledby="categories-title">
        <div className="shell">
          <div className="section-heading"><h2 id="categories-title">Banyak jalan menuju flag.</h2><p>Mulai dari yang membuatmu penasaran.</p></div>
          <div className="category-grid">
            {categories.map((category) => (
              <Link key={category.slug} href={`/challenges?category=${category.slug}`} className="category-link">
                <CategoryIcon category={category.slug} /><h3>{category.name}</h3><p>{category.description}</p>
                <span className="category-arrow"><ArrowIcon /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section id="cara-bermain" className="shell how-section" aria-labelledby="how-title">
        <div className="how-heading">
          <h2 id="how-title">Dari penasaran<br />jadi penemuan.</h2>
          <p>Capture the Flag adalah latihan memecahkan persoalan keamanan siber. Flag menjadi bukti bahwa kamu berhasil menemukan jawabannya.</p>
          <Link href="/rules" className="text-link">Baca aturan bermain<ArrowIcon /></Link>
        </div>
        <ol className="steps">
          <li><span className="step-number" aria-hidden="true">1</span><div><h3>Temukan timmu</h3><p>Masuk dengan Google, lalu buat tim atau bergabung lewat kode dari temanmu.</p></div></li>
          <li><span className="step-number" aria-hidden="true">2</span><div><h3>Pilih challenge</h3><p>Baca soal, jelajahi berkas, dan diskusikan pendekatanmu. Hint tersedia saat kamu membutuhkannya.</p></div></li>
          <li><span className="step-number" aria-hidden="true">3</span><div><h3>Submit flag</h3><p>Jawaban yang tepat menambah progres dan skor tim. Lalu, lanjutkan ke penemuan berikutnya.</p></div></li>
        </ol>
      </section>
      <section id="tentang" className="about-section" aria-labelledby="about-title">
        <div className="shell about-inner">
          <PixelFlag width="40" height="40" /><h2 id="about-title">Ruang untuk mencoba.<br />Ruang untuk bertumbuh.</h2>
          <p>Tidak harus langsung tahu jawabannya. Mulai dari satu soal, pelajari hal baru, dan temukan cara berpikirmu bersama tim.</p>
          <Link href="/login" className="button button-outline">Mulai bersama tim<ArrowIcon /></Link>
        </div>
      </section>
    </main>
  );
}
