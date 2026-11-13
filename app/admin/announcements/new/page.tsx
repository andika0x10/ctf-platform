import { requirePageViewer } from "@/lib/auth/server";
import { AnnouncementEditor } from "@/components/operations-forms";
export const metadata = { title: "Buat pengumuman" };
export default async function Page() { await requirePageViewer("/admin/announcements/new", { organizer: true, profile: true }); return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Buat pengumuman</h1><p>Hanya pengumuman terbit yang dapat dibaca peserta.</p></div><AnnouncementEditor /></main>; }
