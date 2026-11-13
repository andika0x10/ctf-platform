"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function FlagForm({ id, test = false, solved = false }: { id: string; test?: boolean; solved?: boolean }) {
  const router = useRouter(); const [flag, setFlag] = useState(""); const [pending, setPending] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage(""); setError("");
    try {
      const response = await fetch(test ? `/api/admin/challenges/${id}/test-flag` : `/api/challenges/${id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flag }) });
      const result = await response.json() as { error?: string; valid?: boolean; result?: string };
      if (!response.ok) { setError(result.error || "Flag belum dapat diperiksa."); return; }
      setMessage(test ? result.valid ? "Flag sesuai." : "Flag tidak sesuai." : result.result === "correct" ? "Flag benar. Solve dicatat untuk timmu." : result.result === "already_solved" ? "Timmu sudah menyelesaikan challenge ini." : "Flag belum tepat. Periksa kembali jawabanmu.");
      if (result.result === "correct" || result.result === "already_solved") { setFlag(""); router.refresh(); }
    } catch { setError("Koneksi terputus. Muat ulang untuk memeriksa riwayat sebelum mencoba lagi."); } finally { setPending(false); }
  }
  return <>{solved && <p className="form-message" role="status">Sudah diselesaikan oleh timmu.</p>}<form className="stack-form flag-form" onSubmit={submit} aria-busy={pending}><div className="field"><label htmlFor={test ? "test-flag" : "submit-flag"}>{test ? "Flag untuk diuji" : "Flag jawaban"}</label><input id={test ? "test-flag" : "submit-flag"} type={test ? "password" : "text"} value={flag} onChange={e => setFlag(e.target.value)} required maxLength={512} autoComplete="off" spellCheck={false} disabled={pending || solved} /><p className="field-hint">{test ? "Huruf besar dan kecil dibedakan. Uji panitia tidak memengaruhi skor." : "Huruf besar dan kecil dibedakan. Maksimal 10 percobaan per menit untuk setiap challenge."}</p></div><button className="button" disabled={pending || solved}>{pending ? "Memeriksa…" : test ? "Uji flag" : "Kirim flag"}</button>{error && <p className="form-message" role="alert">{error}</p>}{message && <p className="form-message" role="status">{message}</p>}</form></>;
}
