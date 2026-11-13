import Link from "next/link";
export default function NotFound() {
  return <main id="main-content" className="shell interior-page" tabIndex={-1}><section className="empty-state"><p className="error-code">404</p><h1>Halaman tidak ditemukan.</h1><p>Periksa alamatnya atau kembali ke beranda untuk melanjutkan.</p><Link href="/" className="button">Kembali ke beranda</Link></section></main>;
}
