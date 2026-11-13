import Link from "next/link";
import { env } from "cloudflare:workers";
import { requirePageViewer } from "@/lib/auth/server";
import { announcements } from "@/lib/operations";
import { pageNumber } from "@/lib/public-challenges";
import { challengeStatusNames } from "@/lib/challenge-types";
export const metadata = { title: "Kelola pengumuman" };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePageViewer("/admin/announcements", { organizer: true, profile: true }); const page = pageNumber((await searchParams).page); const result = await announcements(env.DB, page, true);
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Kelola pengumuman</h1><p>Sampaikan kabar dan perubahan latihan.</p></div><Link className="button" href="/admin/announcements/new">Buat pengumuman</Link><div className="table-scroll"><table className="data-table"><caption className="visually-hidden">Pengumuman</caption><thead><tr><th>Judul</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{result.entries.map(a => <tr key={a.id}><th scope="row">{a.title}</th><td>{challengeStatusNames[a.status]}</td><td><Link className="text-link" href={`/admin/announcements/${a.id}`}>Edit</Link></td></tr>)}</tbody></table></div>{!result.total && <p className="section-description">Belum ada pengumuman. Buat pengumuman untuk peserta.</p>}<nav className="pagination" aria-label="Halaman pengumuman">{page > 1 && <Link className="text-link" href={`/admin/announcements?page=${page - 1}`}>Sebelumnya</Link>}{page * 20 < result.total && <Link className="text-link" href={`/admin/announcements?page=${page + 1}`}>Berikutnya</Link>}</nav></main>;
}
