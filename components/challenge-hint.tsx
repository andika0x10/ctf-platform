"use client";
import { useState } from "react";
import { Markdown } from "./markdown";
export function ChallengeHint({ id }: { id: string }) {
  const [hint, setHint] = useState<string | null>(null); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function reveal() {
    setPending(true); setError("");
    try { const response = await fetch(`/api/challenges/${id}/hint`, { cache: "no-store" }); const data = await response.json() as { hint: string; error?: string }; if (!response.ok) setError(data.error || "Hint belum dapat dibuka."); else setHint(data.hint); }
    catch { setError("Koneksi terputus. Coba buka hint lagi."); } finally { setPending(false); }
  }
  return <section className="team-section"><h2 className="subheading">Butuh hint?</h2><p className="section-description">Hint gratis. Membukanya tidak mengurangi poin.</p>{hint === null ? <button className="button button-outline" disabled={pending} onClick={() => void reveal()}>{pending ? "Membuka…" : "Buka hint"}</button> : <Markdown>{hint}</Markdown>}{error && <p className="form-message" role="alert">{error}</p>}</section>;
}
