import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import { requirePageViewer } from "@/lib/auth/server";
import { getTeamDetails } from "@/lib/teams";
import { TeamWorkspace } from "@/components/team-workspace";
export const metadata: Metadata = { title: "Kelola tim" };
export default async function AdminTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requirePageViewer(`/admin/teams/${id}`, { organizer: true, profile: true });
  const team = await getTeamDetails(env.DB, id, viewer);
  if (!team) notFound();
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><Link href="/admin/teams" className="text-link">Kembali ke daftar tim</Link><div className="page-heading"><h1>{team.name}</h1><p>Perubahan panitia tercatat pada aktivitas tim.</p></div><TeamWorkspace key={team.id} team={team} viewer={{ id: viewer.id, role: viewer.role }} /></main>;
}
