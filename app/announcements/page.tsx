import Link from "next/link";
import { env } from "cloudflare:workers";
import { announcements } from "@/lib/operations";
import { pageNumber } from "@/lib/public-challenges";
import { formatDate } from "@/lib/format";
import { Markdown } from "@/components/markdown";
export const metadata = { title: "Pengumuman" };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageNumber((await searchParams).page); const result = await announcements(env.DB, page);
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Pengumuman</h1><p>Kabar terbaru dari ruang latihan.</p></div>{result.entries.map(a => <article key={a.id} className="announcement-entry"><h2 className="subheading">{a.title}</h2><p className="field-hint">{formatDate(a.createdAt)} WIB{a.updatedAt !== a.createdAt ? ` / Diperbarui ${formatDate(a.updatedAt)} WIB` : ""}</p><Markdown>{a.body}</Markdown></article>)}{!result.total && <p className="section-description">Belum ada pengumuman. Kabar dari panitia akan muncul di sini.</p>}<nav className="pagination" aria-label="Halaman pengumuman">{page > 1 && <Link className="text-link" href={`/announcements?page=${page - 1}`}>Sebelumnya</Link>}{page * 20 < result.total && <Link className="text-link" href={`/announcements?page=${page + 1}`}>Berikutnya</Link>}</nav></main>;
}
