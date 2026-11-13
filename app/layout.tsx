import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { currentViewer } from "@/lib/auth/server";
import { SessionLifecycle } from "@/components/session-lifecycle";
import { env } from "cloudflare:workers";
import { platformSettings } from "@/lib/operations";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { platformName } = await platformSettings(env.DB);
  return { title: { default: `${platformName} — Ruang latihan bersama`, template: `%s | ${platformName}` }, description: "Ruang latihan Capture the Flag bersama tim. Jelajahi Web, Crypto, Forensics, Reverse, dan Misc dengan ritmemu sendiri." };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await currentViewer();
  const settings = await platformSettings(env.DB);
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <head><link rel="preload" href="/fonts/press-start-2p/PressStart2P-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" /></head>
      <body>
        <a href="#main-content" className="skip-link">Lewati navigasi</a>
        <SiteHeader role={viewer?.role} platformName={settings.platformName} />
        {viewer && <SessionLifecycle />}
        {children}
        <SiteFooter platformName={settings.platformName} />
      </body>
    </html>
  );
}
