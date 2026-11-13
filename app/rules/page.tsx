import type { Metadata } from "next";
import Link from "next/link";
import { env } from "cloudflare:workers";
import { platformSettings } from "@/lib/operations";
import { Markdown } from "@/components/markdown";

export const metadata: Metadata = { title: "Aturan bermain" };
export default async function RulesPage() {
  const { rules } = await platformSettings(env.DB);
  return <main id="main-content" className="shell interior-page rules-page" tabIndex={-1}>
    <div className="page-heading"><h1>Aturan bermain</h1><p>Ruang latihan yang baik dimulai dari cara kita bermain.</p></div>
    <Markdown>{rules}</Markdown>
    <Link href="/challenges" className="button">Lihat challenges</Link>
  </main>;
}
