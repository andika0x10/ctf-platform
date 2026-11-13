import type { Metadata } from "next";
import Link from "next/link";
import { env } from "cloudflare:workers";
import { requirePageViewer } from "@/lib/auth/server";
import { overview } from "@/lib/operations";
import { submissionHistory } from "@/lib/standings";
import { SubmissionTable } from "@/components/submission-table";
export const metadata: Metadata = { title: "Ruang panitia" };
export default async function AdminPage() {
  await requirePageViewer("/admin", { organizer: true, profile: true });
  const [stats, history] = await Promise.all([overview(env.DB), submissionHistory(env.DB, {})]);
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Ruang panitia</h1><p>Kelola challenge, tim, dan aktivitas peserta.</p></div><dl className="overview-stats">{[["Akun", stats!.accounts], ["Tim aktif", stats!.teams], ["Challenge terbit", stats!.challenges], ["Submissions", stats!.submissions], ["Solve tim", stats!.solves]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="action-row"><Link className="button" href="/admin/challenges/new">Buat challenge</Link><Link className="button button-outline" href="/admin/teams">Kelola tim</Link><a className="text-link" href="/api/admin/export">Unduh scoreboard CSV</a></div><section className="team-section"><h2 className="subheading">Submissions terbaru</h2><SubmissionTable entries={history.entries.slice(0, 10)} /><Link className="text-link" href="/admin/submissions">Semua submissions</Link></section></main>;
}
