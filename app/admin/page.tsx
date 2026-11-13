import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Ruang panitia" };
export default function AdminPage() {
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Ruang panitia</h1><p>Kelola tim dan bantu peserta melanjutkan latihan.</p></div><section className="empty-state"><h2>Mulai dari tim peserta.</h2><p>Cari tim, periksa anggotanya, atau bantu mengalihkan kepemilikan.</p><Link className="button" href="/admin/teams">Kelola tim</Link></section></main>;
}
