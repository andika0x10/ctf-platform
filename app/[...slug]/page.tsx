import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PixelFlag } from "@/components/pixel-icons";

const pages: Record<string, { title: string; description: string; detail: string }> = {
  challenges: { title: "Challenges", description: "Tantangan sedang disiapkan.", detail: "Di sini kamu akan menemukan soal Web, Crypto, Forensics, Reverse, dan Misc. Setiap tantangan adalah kesempatan untuk belajar hal baru." },
  scoreboard: { title: "Peringkat", description: "Belum ada peringkat untuk ditampilkan.", detail: "Peringkat akan menampilkan skor dan progres tim setelah latihan dibuka." },
  team: { title: "Tim saya", description: "Ruang untuk timmu sedang disiapkan.", detail: "Kamu akan bisa membuat tim atau bergabung melalui kode, lalu memecahkan tantangan bersama." },
  account: { title: "Akun saya", description: "Ruang pribadimu sedang disiapkan.", detail: "Profil dan riwayat pengirimanmu akan tersedia di sini setelah fitur akun dibuka." },
  login: { title: "Mulai latihan", description: "Datang dengan rasa ingin tahu.", detail: "Akses akun akan menggunakan Google. Setelah masuk, kamu bisa membuat tim atau bergabung dengan temanmu." },
  announcements: { title: "Pengumuman", description: "Belum ada pengumuman.", detail: "Informasi terbaru, tantangan baru, dan kabar dari panitia akan muncul di halaman ini." },
};
type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = (await params).slug.join("/");
  return { title: pages[key]?.title || "Halaman tidak ditemukan" };
}

export default async function FoundationPage({ params }: Props) {
  const key = (await params).slug.join("/");
  const page = pages[key];
  if (!page) notFound();
  return (
    <main id="main-content" className="shell interior-page" tabIndex={-1}>
      <div className="page-heading"><h1>{page.title}</h1></div>
      <section className="empty-state" id={key === "team" ? "bergabung" : key === "account" ? "riwayat" : undefined} aria-labelledby="empty-title">
        <PixelFlag width="64" height="64" /><h2 id="empty-title">{page.description}</h2><p>{page.detail}</p>
        {key === "login" && <div className="login-preview"><button className="button" disabled>Masuk dengan Google</button><p>Login Google segera tersedia.</p></div>}
        <Link href="/" className="text-link">Kembali ke beranda</Link>
      </section>
    </main>
  );
}
