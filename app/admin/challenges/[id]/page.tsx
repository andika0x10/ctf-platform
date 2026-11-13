import { env } from "cloudflare:workers";
import { notFound } from "next/navigation";
import { requirePageViewer } from "@/lib/auth/server";
import { getAdminChallenge } from "@/lib/challenges";
import { ChallengeEditor } from "@/components/challenge-editor";
import { FlagForm } from "@/components/flag-form";
export const metadata = { title: "Edit challenge" };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const viewer = await requirePageViewer(`/admin/challenges/${id}`, { organizer: true, profile: true });
  const challenge = await getAdminChallenge(env.DB, viewer, id); if (!challenge) notFound();
  const { saved } = await searchParams;
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Edit challenge</h1><p>{challenge.title}</p></div>{saved === "1" && <p className="form-message" role="status">Challenge disimpan.</p>}<ChallengeEditor key={challenge.revision} challenge={challenge} /><section className="team-section"><h2 className="subheading">Uji flag tersimpan</h2><p className="section-description">Uji flag oleh panitia tidak dicatat sebagai submission dan tidak memengaruhi skor.</p><FlagForm id={id} test /></section></main>;
}
