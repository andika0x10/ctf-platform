import { notFound } from "next/navigation";
const sections: Record<string, string> = { challenges: "Kelola challenge", participants: "Peserta", submissions: "Pengiriman", announcements: "Pengumuman", settings: "Pengaturan" };
export default async function AdminSection({ params }: { params: Promise<{ section: string[] }> }) {
  const title = sections[(await params).section.join("/")];
  if (!title) notFound();
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>{title}</h1></div><section className="empty-state"><h2>Ruang ini sedang disiapkan.</h2><p>Gunakan menu Panitia untuk mengelola tim peserta yang sudah tersedia.</p></section></main>;
}
