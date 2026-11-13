import Link from "next/link";
import { env } from "cloudflare:workers";
import { requirePageViewer } from "@/lib/auth/server";
import { listAdminChallenges } from "@/lib/challenges";
import { categoryNames, challengeStatusNames } from "@/lib/challenge-types";
import { pageNumber } from "@/lib/public-challenges";
export const metadata = { title: "Kelola challenge" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const viewer = await requirePageViewer("/admin/challenges", { organizer: true, profile: true });
  const { q = "", status = "", page: rawPage } = await searchParams; const page = pageNumber(rawPage);
  const { challenges, total } = await listAdminChallenges(env.DB, viewer, q, status, page);
  const url = (n: number) => `/admin/challenges?${new URLSearchParams({ q, status, page: String(n) })}`;
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Kelola challenge</h1><p>Siapkan challenge, periksa isinya, lalu terbitkan.</p></div><Link className="button" href="/admin/challenges/new">Buat challenge</Link>
    <form className="search-form"><div className="field"><label htmlFor="q">Cari judul</label><input id="q" name="q" defaultValue={q} maxLength={100} /></div><div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={status}><option value="">Semua status</option>{Object.entries(challengeStatusNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><button className="button button-outline">Cari</button></form>
    <div className="table-scroll"><table className="data-table"><caption className="visually-hidden">Challenge</caption><thead><tr><th>Judul</th><th>Kategori</th><th>Status</th><th>Poin awal</th><th>Aksi</th></tr></thead><tbody>{challenges.map(c => <tr key={c.id}><th scope="row">{c.title}</th><td>{categoryNames[c.category]}</td><td>{challengeStatusNames[c.status]}</td><td>{c.initialPoints}</td><td><Link className="text-link" href={`/admin/challenges/${c.id}`}>Edit</Link></td></tr>)}</tbody></table></div>{!challenges.length && <p className="section-description">Belum ada challenge yang sesuai. Buat challenge pertama atau ubah pencarian.</p>}
    <p className="field-hint">{total} challenge ditemukan.</p><nav className="pagination" aria-label="Halaman kelola challenge">{page > 1 && <Link className="text-link" href={url(page - 1)}>Sebelumnya</Link>}{page * 50 < total && <Link className="text-link" href={url(page + 1)}>Berikutnya</Link>}</nav>
  </main>;
}
