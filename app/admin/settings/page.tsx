import { env } from "cloudflare:workers";
import { requirePageViewer } from "@/lib/auth/server";
import { platformSettings } from "@/lib/operations";
import { SettingsForm } from "@/components/operations-forms";
export const metadata = { title: "Pengaturan" };
export default async function Page() { await requirePageViewer("/admin/settings", { organizer: true, profile: true }); const settings = await platformSettings(env.DB); return <main id="main-content" className="shell interior-page" tabIndex={-1}><div className="page-heading"><h1>Pengaturan</h1><p>Atur identitas ruang latihan, pendaftaran, dan aturan bermain.</p></div><SettingsForm settings={settings} /></main>; }
