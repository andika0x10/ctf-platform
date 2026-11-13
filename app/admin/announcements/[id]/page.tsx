import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import { requirePageViewer } from "@/lib/auth/server";
import { announcement } from "@/lib/operations";
import { AnnouncementEditor } from "@/components/operations-forms";
export const metadata = { title: "Edit pengumuman" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const viewer = await requirePageViewer(`/admin/announcements/${id}`, { organizer: true, profile: true }); const entry = await announcement(env.DB, viewer, id); if (!entry) notFound(); return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Edit pengumuman</h1><p>{entry.title}</p></div><AnnouncementEditor key={entry.revision} announcement={entry} /></main>; }
