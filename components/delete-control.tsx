"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteControl({ url, revision, label, description, destination }: {
  url: string; revision: number; label: string; description: string; destination: string;
}) {
  const router = useRouter();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (confirm) panel.current?.focus(); }, [confirm]);
  function cancel() { setConfirm(false); setError(""); trigger.current?.focus(); }
  async function remove() {
    setPending(true); setError("");
    try {
      const response = await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error || "Data belum dapat dihapus."); return; }
      router.push(destination); router.refresh();
    } catch { setError("Koneksi terputus. Muat ulang untuk memeriksa apakah data sudah dihapus."); }
    finally { setPending(false); }
  }
  return <div>
    <button ref={trigger} type="button" className="text-button" aria-expanded={confirm} aria-controls={id} disabled={pending} onClick={() => confirm ? cancel() : setConfirm(true)}>{label}</button>
    {confirm && <div id={id} ref={panel} tabIndex={-1} className="confirmation-panel" role="group" aria-label={`${label}?`} aria-busy={pending} onKeyDown={event => { if (event.key === "Escape" && !pending) { event.stopPropagation(); cancel(); } }}>
      <h2 className="subheading">{label}?</h2><p>{description}</p>
      <div className="action-row"><button type="button" className="button" disabled={pending} onClick={() => void remove()}>{pending ? "Menghapus…" : label}</button><button type="button" className="text-button" disabled={pending} onClick={cancel}>Batal</button></div>
      {error && <p role="alert" className="form-message">{error}</p>}
    </div>}
  </div>;
}
