import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageViewer } from "@/lib/auth/server";
import { defaultDestination } from "@/lib/auth/viewer";
import { safeReturnPath } from "@/lib/auth/config";
import { ProfileForm, SignOutButton } from "@/components/auth-controls";
import { env } from "cloudflare:workers";
import { submissionHistory } from "@/lib/standings";
import { pageNumber } from "@/lib/public-challenges";
import { SubmissionTable } from "@/components/submission-table";

export const metadata: Metadata = { title: "Akun saya" };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function AccountPage({ searchParams }: Props) {
  const viewer = await requirePageViewer("/account");
  const query = await searchParams;
  const requested = safeReturnPath(query.next);
  const next = requested?.split(/[?#]/)[0] === "/account" ? null : requested;
  const destination = next || defaultDestination(viewer.role);
  if (viewer.profileComplete && (query.welcome === "1" || next)) redirect(destination);
  const page = pageNumber(query.page); const history = await submissionHistory(env.DB, { userId: viewer.id }, page);
  return <main id="main-content" className="shell interior-page" tabIndex={-1}>
    <div className="page-heading"><h1>{viewer.profileComplete ? "Akun saya" : "Kenalkan nama tampilanmu."}</h1><p>{viewer.profileComplete ? "Atur identitasmu di ruang latihan." : "Pilih nama yang akan dikenali timmu sebelum mulai latihan."}</p></div>
    {query.notice === "organizer-only" && <p role="status" className="form-message">Halaman panitia hanya tersedia untuk akun panitia.</p>}
    <div className="account-grid"><section aria-labelledby="profile-title"><h2 id="profile-title" className="subheading">Identitas akun</h2><ProfileForm viewer={viewer} destination={viewer.profileComplete ? null : destination} /></section>
      <section className="account-details" aria-labelledby="account-title"><h2 id="account-title" className="subheading">Akun Google</h2>
        <dl className="details-list"><div><dt>Email pribadi</dt><dd>{viewer.email}</dd></div><div><dt>Akses</dt><dd>{viewer.role === "organizer" ? "Panitia" : "Peserta"}</dd></div></dl>
        {viewer.profileComplete && <Link className="text-link" href={destination}>{viewer.role === "organizer" ? "Buka ruang panitia" : "Buka tim saya"}</Link>}
        <SignOutButton />
      </section></div>
    <section id="riwayat" className="account-history"><h2 className="subheading">Riwayat submissions</h2><p className="field-hint">{history.total} submission. Setiap submission mencatat timmu saat submit flag.</p><SubmissionTable entries={history.entries} /><nav className="pagination" aria-label="Halaman riwayat submissions">{page > 1 && <Link className="text-link" href={`/account?page=${page - 1}#riwayat`}>Sebelumnya</Link>}{page * 50 < history.total && <Link className="text-link" href={`/account?page=${page + 1}#riwayat`}>Berikutnya</Link>}</nav></section>
  </main>;
}
