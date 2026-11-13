import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PixelFlag } from "@/components/pixel-icons";
import { requirePageViewer } from "@/lib/auth/server";

const pages: Record<string, { title: string; description: string; detail: string }> = {
  challenges: { title: "Challenges", description: "Tantangan sedang disiapkan.", detail: "Di sini kamu akan menemukan soal Web, Crypto, Forensics, Reverse, dan Misc. Setiap tantangan adalah kesempatan untuk belajar hal baru." },
  scoreboard: { title: "Peringkat", description: "Belum ada peringkat untuk ditampilkan.", detail: "Peringkat akan menampilkan skor dan progres tim setelah latihan dibuka." },
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
  if (key === "challenges") await requirePageViewer("/challenges");
  return (
    <main id="main-content" className="shell interior-page" tabIndex={-1}>
      <div className="page-heading"><h1>{page.title}</h1></div>
      <section className="empty-state" aria-labelledby="empty-title">
        <PixelFlag width="64" height="64" /><h2 id="empty-title">{page.description}</h2><p>{page.detail}</p>
        <Link href="/" className="text-link">Kembali ke beranda</Link>
      </section>
    </main>
  );
}
