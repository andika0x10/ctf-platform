import Link from "next/link";
import { env } from "cloudflare:workers";
import { requirePageViewer } from "@/lib/auth/server";
import { listPlayableChallenges, pageNumber } from "@/lib/public-challenges";
import { categoryNames, difficultyNames } from "@/lib/challenge-types";
export const metadata = { title: "Challenges" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePageViewer("/challenges", { profile: true });
  const { q = "", category = "", page: rawPage } = await searchParams; const page = pageNumber(rawPage);
  const result = await listPlayableChallenges(env.DB, q, category, page);
  const url = (n: number) => `/challenges?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&page=${n}`;
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Challenges</h1><p>Pilih satu tantangan. Temukan jalannya bersama timmu.</p></div>
    <form className="search-form"><div className="field"><label htmlFor="q">Cari judul</label><input id="q" name="q" defaultValue={q} maxLength={100} /></div><div className="field"><label htmlFor="category">Kategori</label><select id="category" name="category" defaultValue={category}><option value="">Semua kategori</option>{Object.entries(categoryNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><button className="button button-outline">Tampilkan</button></form>
    <p className="field-hint">{result.total} challenge ditemukan.</p><ul className="challenge-list">{result.challenges.map(c => <li key={c.id}><div><p className="field-hint">{categoryNames[c.category]} / {difficultyNames[c.difficulty]}</p><h2><Link href={`/challenges/${c.id}`}>{c.title}</Link></h2></div><span className="challenge-points">{c.points} poin</span></li>)}</ul>
    {!result.total && <p className="section-description">Belum ada challenge yang sesuai. Ubah pencarian atau kembali setelah panitia menerbitkan tantangan.</p>}
    <nav className="pagination" aria-label="Halaman challenge">{page > 1 && <Link className="text-link" href={url(page - 1)}>Sebelumnya</Link>}{page * 50 < result.total && <Link className="text-link" href={url(page + 1)}>Berikutnya</Link>}</nav>
  </main>;
}
