import type { Metadata } from "next";
import Link from "next/link";
import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { requirePageViewer } from "@/lib/auth/server";
import { getCurrentTeam } from "@/lib/teams";
import { TeamWorkspace } from "@/components/team-workspace";

export const metadata: Metadata = { title: "Tim saya" };
export default async function TeamPage() {
  const viewer = await requirePageViewer("/team", { profile: true });
  if (viewer.role === "organizer") redirect("/admin/teams");
  const team = await getCurrentTeam(env.DB, viewer);
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>{team?.name || "Temukan timmu."}</h1><p>{team ? "Satu tim, banyak cara berpikir." : "Mulai tim sendiri atau bergabung dengan temanmu."}</p></div>{team && <div className="action-row"><Link className="text-link" href={`/teams/${team.id}`}>Lihat skor dan riwayat solve tim</Link><Link className="text-link" href="/team/history">Semua pengiriman tim</Link></div>}<TeamWorkspace key={team?.id || "no-team"} team={team} viewer={{ id: viewer.id, role: viewer.role }} /></main>;
}
