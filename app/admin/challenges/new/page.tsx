import { requirePageViewer } from "@/lib/auth/server";
import { ChallengeEditor } from "@/components/challenge-editor";
export const metadata = { title: "Buat challenge" };
export default async function Page() {
  await requirePageViewer("/admin/challenges/new", { organizer: true, profile: true });
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Buat challenge</h1><p>Mulai dari draft. Flag yang disimpan tidak ditampilkan kembali.</p></div><ChallengeEditor /></main>;
}
