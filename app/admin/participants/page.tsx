import Link from "next/link";
import { env } from "cloudflare:workers";
import { requirePageViewer } from "@/lib/auth/server";
import { getAuthConfiguration } from "@/lib/auth/config";
import { participants } from "@/lib/operations";
import { pageNumber } from "@/lib/public-challenges";
import { SuspendControl } from "@/components/operations-forms";
export const metadata = { title: "Kelola peserta" };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requirePageViewer("/admin/participants", { organizer: true, profile: true }); const { q = "", page: rawPage } = await searchParams; const page = pageNumber(rawPage); const result = await participants(env.DB, getAuthConfiguration(env)!.organizerEmails, q, page);
  const url = (n: number) => `/admin/participants?q=${encodeURIComponent(q)}&page=${n}`;
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Kelola peserta</h1><p>Periksa akun dan bantu menjaga ruang latihan.</p></div><form className="search-form"><div className="field"><label htmlFor="q">Cari nama atau email</label><input id="q" name="q" defaultValue={q} maxLength={100} /></div><button className="button button-outline">Cari</button></form><p className="field-hint">{result.total} akun ditemukan. Email hanya terlihat oleh panitia.</p><div className="table-scroll"><table className="data-table"><caption className="visually-hidden">Daftar akun</caption><thead><tr><th>Nama</th><th>Email</th><th>Akses / Status</th><th>Aksi</th></tr></thead><tbody>{result.entries.map(person => <tr key={person.id}><th scope="row">{person.name}</th><td>{person.email}</td><td>{person.role === "organizer" ? "Panitia" : "Peserta"} / {person.suspended ? "Suspend" : "Aktif"}{!person.profileComplete && <p className="field-hint">Profil belum lengkap</p>}</td><td><div className="table-actions"><Link className="text-link" href={`/admin/submissions?userId=${person.id}`}>Riwayat submissions</Link>{person.role === "participant" && <SuspendControl id={person.id} name={person.name} suspended={Boolean(person.suspended)} />}</div></td></tr>)}</tbody></table></div>{!result.total && <p className="section-description">Tidak ada akun yang sesuai.</p>}<nav className="pagination" aria-label="Halaman akun">{page > 1 && <Link className="text-link" href={url(page - 1)}>Sebelumnya</Link>}{page * 50 < result.total && <Link className="text-link" href={url(page + 1)}>Berikutnya</Link>}</nav></main>;
}
