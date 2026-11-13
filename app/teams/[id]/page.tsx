import Link from "next/link";
import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import { publicTeam } from "@/lib/standings";
import { pageNumber } from "@/lib/public-challenges";
import { categoryNames } from "@/lib/challenge-types";
import { formatDate } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
export const metadata = { title: "Profil tim" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id } = await params; const page = pageNumber((await searchParams).page); const team = await publicTeam(env.DB, id, page); if (!team) notFound();
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><Link className="text-link" href="/scoreboard">Semua tim</Link><div className="page-heading challenge-heading"><h1>{team.name}</h1><p>Peringkat {team.rank} / {team.score} poin / {team.solveCount} solve{team.status === "archived" ? " / Diarsipkan" : ""}</p></div><LiveRefresh />
    <section className="team-section"><h2 className="subheading">Anggota saat ini</h2>{team.members.length ? <ul className="download-list">{team.members.map((member, i) => <li className="field-hint" key={i}>{member.name}</li>)}</ul> : <p className="section-description">Tidak ada anggota aktif. Riwayat solve tetap tersimpan pada tim ini.</p>}</section>
    <section className="team-section"><h2 className="subheading">Riwayat solve tim</h2><p className="section-description">Poin menampilkan nilai saat ini. Solve tetap milik tim tempat flag dikirim meskipun pengirim telah berpindah.</p><div className="table-scroll"><table className="data-table"><caption className="visually-hidden">Solve tim</caption><thead><tr><th>Challenge</th><th>Kategori</th><th>Poin</th><th>Diselesaikan oleh</th><th>Waktu (WIB)</th></tr></thead><tbody>{team.solves.map(s => <tr key={s.id}><th scope="row">{s.status === "published" ? <Link className="text-link" href={`/challenges/${s.id}`}>{s.title}</Link> : <>{s.title}<p className="field-hint">Diarsipkan</p></>}</th><td>{categoryNames[s.category]}</td><td>{s.points}</td><td>{s.solverName}</td><td>{formatDate(s.solvedAt)}</td></tr>)}</tbody></table></div>{!team.solveCount && <p className="section-description">Tim ini belum menyelesaikan challenge.</p>}
      <nav className="pagination" aria-label="Halaman solve tim">{page > 1 && <Link className="text-link" href={`/teams/${id}?page=${page - 1}`}>Sebelumnya</Link>}{page * 50 < team.solveCount && <Link className="text-link" href={`/teams/${id}?page=${page + 1}`}>Berikutnya</Link>}</nav>
    </section>
  </main>;
}
