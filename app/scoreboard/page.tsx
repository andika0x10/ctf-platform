import Link from "next/link";
import { env } from "cloudflare:workers";
import { standings } from "@/lib/standings";
import { pageNumber } from "@/lib/public-challenges";
import { LiveRefresh } from "@/components/live-refresh";
export const metadata = { title: "Scoreboard" };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageNumber((await searchParams).page); const result = await standings(env.DB, page);
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Scoreboard</h1><p>Pantau skor dan jumlah solve setiap tim.</p></div><LiveRefresh /><p className="section-description">Poin setiap challenge turun bersama jumlah tim yang menyelesaikannya. Jika skor sama, tim dengan solve terakhir lebih awal berada di atas. Jika waktunya juga sama, urutan ditentukan oleh ID tim.</p>
    <div className="table-scroll"><table className="data-table"><caption className="visually-hidden">Scoreboard tim</caption><thead><tr><th scope="col">Posisi / Tim</th><th scope="col">Skor</th><th scope="col">Solve</th></tr></thead><tbody>{result.teams.map(team => <tr key={team.id}><th scope="row">{team.rank}. <Link className="text-link" href={`/teams/${team.id}`}>{team.name}</Link>{team.status === "archived" && <p className="field-hint">Tim tidak aktif</p>}</th><td>{team.score}</td><td>{team.solveCount}</td></tr>)}</tbody></table></div>{!result.total && <p className="section-description">Belum ada tim. Buat tim dan mulai latihan untuk tampil di scoreboard.</p>}<nav className="pagination" aria-label="Halaman scoreboard">{page > 1 && <Link className="text-link" href={`/scoreboard?page=${page - 1}`}>Sebelumnya</Link>}{page * 50 < result.total && <Link className="text-link" href={`/scoreboard?page=${page + 1}`}>Berikutnya</Link>}</nav>
  </main>;
}
