"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Markdown } from "./markdown";
import { DeleteControl } from "./delete-control";
import { categoryNames, difficultyNames, challengeStatusNames, type ChallengeDocument } from "@/lib/challenge-types";

export function ChallengeEditor({ challenge }: { challenge?: ChallengeDocument }) {
  const router = useRouter();
  const [description, setDescription] = useState(challenge?.description || "");
  const [hint, setHint] = useState(challenge?.hint || "");
  const [links, setLinks] = useState(challenge?.links || []);
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    setPending(true); setError("");
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`/api/admin/challenges${challenge ? `/${challenge.id}` : ""}`, { method: challenge ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, description, hint, links, initialPoints: Number(form.get("initialPoints")), minimumPoints: Number(form.get("minimumPoints")), decay: Number(form.get("decay")), ...(challenge ? { revision: challenge.revision } : {}) }) });
      const result = await response.json() as { id: string; error?: string };
      if (!response.ok) { setError(result.error || "Challenge belum dapat disimpan."); return; }
      router.push(`/admin/challenges/${result.id}?saved=1`); router.refresh();
    } catch { setError("Koneksi terputus. Muat ulang untuk memeriksa perubahan sebelum mencoba lagi."); }
    finally { setPending(false); }
  }
  return <form className="stack-form editor-form" onSubmit={save} aria-busy={pending}>
    {error && <p className="form-message" role="alert">{error}</p>}
    <fieldset disabled={pending} className="editor-fields">
      <div className="field"><label htmlFor="title">Judul</label><input id="title" name="title" defaultValue={challenge?.title} maxLength={100} required /></div>
      <div className="form-columns"><div className="field"><label htmlFor="category">Kategori</label><select id="category" name="category" defaultValue={challenge?.category || "web"}>{Object.entries(categoryNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div className="field"><label htmlFor="difficulty">Kesulitan</label><select id="difficulty" name="difficulty" defaultValue={challenge?.difficulty || "easy"}>{Object.entries(difficultyNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></div>
      <div className="field"><label htmlFor="description">Deskripsi (Markdown)</label><textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={12} maxLength={20000} required /></div>
      <div className="field"><label htmlFor="connectionInfo">Alamat atau perintah koneksi (opsional)</label><textarea id="connectionInfo" name="connectionInfo" defaultValue={challenge?.connectionInfo} rows={2} maxLength={2000} /><p className="field-hint">Contoh: URL target atau perintah nc. Ditampilkan sebagai teks.</p></div>
      <div className="field"><label htmlFor="hint">Hint gratis (opsional, Markdown)</label><textarea id="hint" value={hint} onChange={e => setHint(e.target.value)} rows={4} maxLength={4000} /></div>
      <section><h2 className="subheading">Berkas pendukung</h2><p className="field-hint">Tautan HTTPS ke penyimpanan eksternal. Maksimal 10 berkas.</p>
        {links.map((link, i) => <div className="download-editor" key={i}><div className="field"><label htmlFor={`link-name-${i}`}>Nama berkas {i + 1}</label><input id={`link-name-${i}`} value={link.name} maxLength={100} required onChange={e => setLinks(links.map((item, n) => n === i ? { ...item, name: e.target.value } : item))} /></div><div className="field"><label htmlFor={`link-url-${i}`}>URL HTTPS {i + 1}</label><input id={`link-url-${i}`} type="url" value={link.url} maxLength={2048} required onChange={e => setLinks(links.map((item, n) => n === i ? { ...item, url: e.target.value } : item))} /></div><button className="text-button" type="button" onClick={() => setLinks(links.filter((_, n) => n !== i))}>Hapus berkas {i + 1}</button></div>)}
        <button type="button" className="text-button" disabled={links.length >= 10} onClick={() => setLinks([...links, { name: "", url: "" }])}>Tambah tautan berkas</button>
      </section>
      <section><h2 className="subheading">Skor dinamis</h2><p className="field-hint">Poin turun mengikuti jumlah tim yang menyelesaikan challenge, hingga batas minimum. Mengubah parameter akan menghitung ulang skor seluruh tim yang sudah solve.</p><div className="form-columns">
        {[["initialPoints", "Poin awal", challenge?.initialPoints ?? 500], ["minimumPoints", "Poin minimum", challenge?.minimumPoints ?? 100], ["decay", "Jumlah tim menuju minimum", challenge?.decay ?? 50]].map(([name, label, value]) => <div className="field" key={name}><label htmlFor={String(name)}>{label}</label><input id={String(name)} name={String(name)} type="number" min={1} max={100000} defaultValue={value} required /></div>)}
      </div></section>
      <div className="field"><label htmlFor="flag">{challenge ? "Ganti flag (opsional)" : "Flag"}</label><input id="flag" name="flag" type="password" autoComplete="new-password" maxLength={512} required={!challenge} /><p className="field-hint">Huruf besar dan kecil dibedakan. Spasi di awal/akhir diabaikan. {challenge && "Kosongkan untuk mempertahankan flag saat ini."}</p></div>
      <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={challenge?.status === "published" ? "published" : "draft"}>{Object.entries(challengeStatusNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><p className="field-hint">Hanya challenge terbit yang dapat dimainkan.</p></div>
      <div className="action-row"><button className="button" disabled={pending}>{pending ? "Menyimpan…" : "Simpan challenge"}</button><button className="button button-outline" type="button" aria-expanded={preview} onClick={() => setPreview(!preview)}>Pratinjau teks</button><Link className="text-link" href="/admin/challenges">Kembali ke daftar</Link></div>
      {challenge && <DeleteControl url={`/api/admin/challenges/${challenge.id}`} revision={challenge.revision} label="Hapus challenge" description="Challenge beserta seluruh solve dan submissions terkait akan dihapus permanen. Skor seluruh tim akan dihitung ulang. Tindakan ini tidak dapat dibatalkan." destination="/admin/challenges" />}
    </fieldset>
    {preview && <section className="preview-panel"><h2 className="subheading">Pratinjau deskripsi</h2><Markdown>{description}</Markdown>{hint && <><h3 className="subheading">Hint</h3><Markdown>{hint}</Markdown></>}</section>}
  </form>;
}
