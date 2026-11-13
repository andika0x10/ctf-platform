import Link from "next/link";
import { env } from "cloudflare:workers";
import { requirePageViewer } from "@/lib/auth/server";
import { submissionHistory } from "@/lib/standings";
import { pageNumber } from "@/lib/public-challenges";
import { SubmissionTable, resultNames } from "@/components/submission-table";
export const metadata = { title: "Submissions peserta" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requirePageViewer("/admin/submissions", { organizer: true, profile: true }); const { q = "", result = "", userId = "", teamId = "", challengeId = "", page: rawPage } = await searchParams; const page = pageNumber(rawPage);
  const history = await submissionHistory(env.DB, { search: q, result, userId, teamId, challengeId }, page);
  const url = (n: number) => `/admin/submissions?${new URLSearchParams({ q, result, userId, teamId, challengeId, page: String(n) })}`;
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Submissions peserta</h1><p>Lihat hasil submission dan tim peserta saat submit flag.</p></div><form className="search-form"><div className="field"><label htmlFor="q">Cari challenge, tim, atau peserta</label><input id="q" name="q" defaultValue={q} maxLength={100} /></div><div className="field"><label htmlFor="result">Hasil</label><select id="result" name="result" defaultValue={result}><option value="">Semua hasil</option>{Object.entries(resultNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>{Object.entries({ userId, teamId, challengeId }).map(([key, value]) => value && <input key={key} type="hidden" name={key} value={value} />)}<button className="button button-outline">Tampilkan</button><Link className="text-link" href="/admin/submissions">Hapus filter</Link></form><p className="field-hint">{history.total} submission ditemukan.</p><SubmissionTable entries={history.entries} /><nav className="pagination" aria-label="Halaman submissions">{page > 1 && <Link className="text-link" href={url(page - 1)}>Sebelumnya</Link>}{page * 50 < history.total && <Link className="text-link" href={url(page + 1)}>Berikutnya</Link>}</nav></main>;
}
