import Link from "next/link";
import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { requirePageViewer } from "@/lib/auth/server";
import { getCurrentTeam } from "@/lib/teams";
import { submissionHistory } from "@/lib/standings";
import { pageNumber } from "@/lib/public-challenges";
import { SubmissionTable } from "@/components/submission-table";
export const metadata = { title: "Pengiriman tim" };
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const viewer = await requirePageViewer("/team/history", { profile: true }); const team = await getCurrentTeam(env.DB, viewer); if (!team) redirect("/team");
  const page = pageNumber((await searchParams).page); const history = await submissionHistory(env.DB, { teamId: team.id }, page);
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><Link className="text-link" href="/team">Tim saya</Link><div className="page-heading challenge-heading"><h1>Pengiriman tim</h1><p>{team.name} / {history.total} pengiriman</p></div><SubmissionTable entries={history.entries} /><nav className="pagination" aria-label="Halaman pengiriman tim">{page > 1 && <Link className="text-link" href={`/team/history?page=${page - 1}`}>Sebelumnya</Link>}{page * 50 < history.total && <Link className="text-link" href={`/team/history?page=${page + 1}`}>Berikutnya</Link>}</nav></main>;
}
