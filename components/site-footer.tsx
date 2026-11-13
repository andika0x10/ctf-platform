import Link from "next/link";
import { PixelFlag } from "./pixel-icons";

export function SiteFooter({ platformName = "CTF Platform" }: { platformName?: string }) {
  return <footer className="site-footer"><div className="shell footer-inner">
    <Link href="/" className="brand footer-brand"><PixelFlag width="24" height="24" /><span>{platformName}</span></Link>
    <p>Selalu ada hal baru untuk ditemukan.</p>
    <Link href="/rules">Aturan bermain</Link>
  </div></footer>;
}
