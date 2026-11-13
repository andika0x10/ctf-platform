"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Announcement } from "@/lib/operations";
import { Markdown } from "./markdown";
function useSave() {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function save(url: string, body: unknown, method = "PATCH") {
    setPending(true); setError(""); setMessage("");
    try { const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json() as { error?: string; id?: string }; if (!response.ok) { setError(result.error || "Perubahan belum dapat disimpan."); return; } setMessage("Perubahan disimpan."); router.refresh(); return result; }
    catch { setError("Koneksi terputus. Muat ulang untuk memeriksa perubahan."); } finally { setPending(false); }
  }
  return { pending, error, message, save, router };
}
function Feedback({ error, message }: { error: string; message: string }) { return <>{error && <p className="form-message" role="alert">{error}</p>}{message && <p className="form-message" role="status">{message}</p>}</>; }
export function SettingsForm({ settings }: { settings: { platformName: string; registrationOpen: boolean; rules: string } }) {
  const state = useSave();
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); void state.save("/api/admin/settings", { platformName: form.get("platformName"), registrationOpen: form.get("registrationOpen") === "on", rules: form.get("rules") }); }
  return <form className="stack-form editor-form" onSubmit={submit}><fieldset className="editor-fields" disabled={state.pending}><div className="field"><label htmlFor="platformName">Nama platform</label><input id="platformName" name="platformName" defaultValue={settings.platformName} required maxLength={24} /></div><label className="checkbox-field"><input name="registrationOpen" type="checkbox" defaultChecked={settings.registrationOpen} />Izinkan akun baru mendaftar</label><p className="field-hint">Jika ditutup, peserta yang sudah terdaftar tetap dapat masuk.</p><div className="field"><label htmlFor="rules">Aturan bermain (Markdown)</label><textarea id="rules" name="rules" defaultValue={settings.rules} maxLength={40000} rows={20} required /></div><button className="button">{state.pending ? "Menyimpan…" : "Simpan pengaturan"}</button></fieldset><Feedback {...state} /></form>;
}
export function AnnouncementEditor({ announcement }: { announcement?: Announcement }) {
  const state = useSave(); const [body, setBody] = useState(announcement?.body || ""); const [preview, setPreview] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await state.save(`/api/admin/announcements${announcement ? `/${announcement.id}` : ""}`, { title: form.get("title"), status: form.get("status"), body, ...(announcement ? { revision: announcement.revision } : {}) }, announcement ? "PATCH" : "POST"); if (result?.id) { state.router.push(`/admin/announcements/${result.id}`); state.router.refresh(); } }
  return <form className="stack-form editor-form" onSubmit={submit}><fieldset className="editor-fields" disabled={state.pending}><div className="field"><label htmlFor="title">Judul</label><input id="title" name="title" defaultValue={announcement?.title} maxLength={100} required /></div><div className="field"><label htmlFor="body">Isi pengumuman (Markdown)</label><textarea id="body" value={body} onChange={e => setBody(e.target.value)} maxLength={20000} rows={14} required /></div><div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={announcement?.status || "draft"}><option value="draft">Draft</option><option value="published">Terbit</option><option value="archived">Arsip</option></select></div><div className="action-row"><button className="button">{state.pending ? "Menyimpan…" : "Simpan pengumuman"}</button><button type="button" className="button button-outline" aria-expanded={preview} onClick={() => setPreview(!preview)}>Pratinjau</button></div></fieldset><Feedback {...state} />{preview && <section className="preview-panel"><Markdown>{body}</Markdown></section>}</form>;
}
export function SuspendControl({ id, name, suspended }: { id: string; name: string; suspended: boolean }) {
  const state = useSave(); const [confirm, setConfirm] = useState(false); const trigger = useRef<HTMLButtonElement>(null);
  return <><button ref={trigger} className="text-button" onClick={() => setConfirm(!confirm)} aria-expanded={confirm}>{suspended ? "Aktifkan akun" : "Suspend akun"}</button>{confirm && <div className="moderation-confirm"><p className="field-hint">{suspended ? `Aktifkan kembali ${name}? Peserta perlu masuk ulang.` : `Suspend ${name}? Semua sesi dicabut. Tim dan riwayat tetap tersimpan.`}</p><div className="action-row"><button className="text-button" disabled={state.pending} onClick={async () => { const result = await state.save(`/api/admin/participants/${id}`, { suspended: !suspended }); if (result) { setConfirm(false); trigger.current?.focus(); } }}>Ya, {suspended ? "aktifkan" : "suspend"}</button><button className="text-button" disabled={state.pending} onClick={() => { setConfirm(false); trigger.current?.focus(); }}>Batal</button></div></div>}<Feedback {...state} /></>;
}
