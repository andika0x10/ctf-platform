import Link from "next/link";
import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import { requirePageViewer } from "@/lib/auth/server";
import { getPlayableChallenge } from "@/lib/public-challenges";
import { getCurrentTeam } from "@/lib/teams";
import { categoryNames, difficultyNames } from "@/lib/challenge-types";
import { Markdown } from "@/components/markdown";
import { ChallengeHint } from "@/components/challenge-hint";
export const metadata = { title: "Challenge" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const viewer = await requirePageViewer(`/challenges/${id}`, { profile: true });
  const challenge = await getPlayableChallenge(env.DB, id); if (!challenge) notFound();
  const team = await getCurrentTeam(env.DB, viewer);
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><Link className="text-link" href="/challenges">Semua challenge</Link><div className="page-heading challenge-heading"><h1>{challenge.title}</h1><p>{categoryNames[challenge.category]} / {difficultyNames[challenge.difficulty]} / {challenge.points} poin</p></div>
    <Markdown>{challenge.description}</Markdown>{challenge.connectionInfo && <section className="team-section"><h2 className="subheading">Target</h2><pre className="connection-info">{challenge.connectionInfo}</pre></section>}
    {challenge.links.length > 0 && <section className="team-section"><h2 className="subheading">Berkas pendukung</h2><ul className="download-list">{challenge.links.map((link, i) => <li key={i}><a className="text-link" href={link.url} target="_blank" rel="noopener noreferrer">{link.name}</a></li>)}</ul></section>}
    {challenge.hasHint && <ChallengeHint id={id} />}
    <section className="team-section"><h2 className="subheading">Kirim flag</h2>{viewer.role === "organizer" ? <p className="section-description">Akun panitia tidak ikut penilaian. Kelola challenge melalui menu Panitia.</p> : !team ? <p className="section-description">Buat atau gabung <Link className="text-link" href="/team">tim terlebih dahulu</Link> untuk mengirim flag.</p> : <p className="section-description">Kamu bermain bersama {team.name}. Pengiriman flag tersedia setelah penilaian diaktifkan.</p>}</section>
  </main>;
}
