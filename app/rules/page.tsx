import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Aturan bermain" };
const rules = [
  { title: "Bermain bersama tim", text: "Gunakan akunmu sendiri dan bergabung dalam satu tim. Setiap solve menjadi pencapaian tim tempat kamu mengirim flag." },
  { title: "Uji hanya target challenge", text: "Lakukan pengujian pada berkas dan layanan yang disebutkan dalam soal. Infrastruktur platform dan akun peserta lain berada di luar target latihan." },
  { title: "Jaga ruang untuk belajar", text: "Diskusikan pendekatan bersama timmu. Hindari menyebarkan flag agar peserta lain tetap punya kesempatan menemukan jawabannya." },
  { title: "Pahami skor dinamis", text: "Nilai challenge turun seiring bertambahnya tim yang menyelesaikannya, sampai mencapai nilai minimum. Perubahan berlaku untuk seluruh tim yang sudah solve." },
  { title: "Gunakan hint saat perlu", text: "Hint tersedia secara gratis jika disediakan panitia. Membukanya tidak mengurangi skor tim." },
  { title: "Hormati peserta lain", text: "Belajar berlangsung dengan ritme yang berbeda. Bantu menjaga diskusi yang terbuka, ramah, dan saling menghargai." },
];
export default function RulesPage() {
  return <main id="main-content" className="shell interior-page rules-page" tabIndex={-1}>
    <div className="page-heading"><h1>Aturan bermain</h1><p>Ruang latihan yang baik dimulai dari cara kita bermain.</p></div>
    <div className="rules-list">{rules.map((rule) => <section key={rule.title}><h2>{rule.title}</h2><p>{rule.text}</p></section>)}</div>
    <Link href="/challenges" className="button">Lihat challenges</Link>
  </main>;
}
