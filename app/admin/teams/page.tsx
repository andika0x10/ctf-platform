import type { Metadata } from "next";
import Link from "next/link";
import { env } from "cloudflare:workers";
import { listTeams } from "@/lib/teams";
import { requirePageViewer } from "@/lib/auth/server";
export const metadata: Metadata = { title: "Kelola tim" };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function AdminTeamsPage({ searchParams }: Props) {
  await requirePageViewer("/admin/teams", { organizer: true, profile: true });
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const page = Math.min(10000, Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1));
  const result = await listTeams(env.DB, query, page);
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Kelola tim</h1><p>Tim aktif dan arsip tetap tercatat di sini.</p></div>
    <form className="search-form" action="/admin/teams"><div className="field"><label htmlFor="team-search">Cari nama tim</label><input id="team-search" name="q" defaultValue={query} maxLength={100} /></div><button className="button button-outline">Cari tim</button></form>
    <p className="field-hint">{result.total} tim ditemukan.</p>
    <div className="table-scroll"><table className="data-table"><caption className="visually-hidden">Daftar tim</caption><thead><tr><th scope="col">Tim</th><th scope="col">Pemilik</th><th scope="col">Anggota</th><th scope="col">Status</th><th scope="col">Aksi</th></tr></thead><tbody>{result.teams.map((team) => <tr key={team.id}><th scope="row">{team.name}</th><td>{team.ownerName}</td><td>{team.memberCount}</td><td>{team.status === "active" ? "Aktif" : "Diarsipkan"}</td><td><Link className="text-link" href={`/admin/teams/${team.id}`}>Kelola</Link></td></tr>)}</tbody></table></div>
    {result.teams.length === 0 && <p className="section-description">Belum ada tim yang sesuai dengan pencarian.</p>}
    <nav className="pagination" aria-label="Halaman daftar tim">{page > 1 && <Link className="text-link" href={`/admin/teams?q=${encodeURIComponent(query)}&page=${page - 1}`}>Sebelumnya</Link>}{page * 50 < result.total && <Link className="text-link" href={`/admin/teams?q=${encodeURIComponent(query)}&page=${page + 1}`}>Berikutnya</Link>}</nav>
  </main>;
}
