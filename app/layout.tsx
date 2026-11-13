import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: { default: "CTF Platform — Ruang latihan bersama", template: "%s | CTF Platform" },
  description: "Ruang latihan Capture the Flag bersama tim. Jelajahi Web, Crypto, Forensics, Reverse, dan Misc dengan ritmemu sendiri.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <head><link rel="preload" href="/fonts/press-start-2p/PressStart2P-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous" /></head>
      <body>
        <a href="#main-content" className="skip-link">Lewati navigasi</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
