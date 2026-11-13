import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { HistoryEntry } from "@/lib/standings";
export const resultNames: Record<string, string> = { correct: "Benar", incorrect: "Belum tepat", already_solved: "Sudah diselesaikan tim" };
export function SubmissionTable({ entries }: { entries: HistoryEntry[] }) {
  if (!entries.length) return <p className="section-description">Belum ada pengiriman yang sesuai.</p>;
  return <div className="table-scroll"><table className="data-table"><caption className="visually-hidden">Riwayat pengiriman</caption><thead><tr><th>Challenge</th><th>Tim saat dikirim</th><th>Peserta</th><th>Hasil</th><th>Waktu (WIB)</th></tr></thead><tbody>{entries.map(entry => <tr key={entry.id}><th scope="row">{entry.title}</th><td><Link className="text-link" href={`/teams/${entry.teamId}`}>{entry.teamName}</Link></td><td>{entry.userName}</td><td>{resultNames[entry.result]}</td><td>{formatDate(entry.submittedAt)}</td></tr>)}</tbody></table></div>;
}
