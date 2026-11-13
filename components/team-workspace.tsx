"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { TeamAction, TeamDetails } from "@/lib/teams";
import type { Viewer } from "@/lib/auth/viewer";
import { formatDate } from "@/lib/format";

type Confirmation = { action: TeamAction; title: string; description: string; label: string };
const eventLabels: Record<string, string> = { created: "Membuat tim", joined: "Bergabung", renamed: "Mengubah nama tim", invite_rotated: "Mengganti kode bergabung", removed: "Mengeluarkan anggota", ownership_transferred: "Mengalihkan kepemilikan", left: "Keluar dari tim", archived: "Mengarsipkan tim" };

export function TeamWorkspace({ team, viewer }: { team: TeamDetails | null; viewer: Pick<Viewer, "id" | "role"> }) {
  const router = useRouter();
  const [name, setName] = useState(team?.name || "");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, updateConfirmation] = useState<Confirmation | null>(null);
  const confirmationPanel = useRef<HTMLElement>(null);
  const confirmationTrigger = useRef<HTMLElement | null>(null);
  function setConfirmation(value: Confirmation | null) {
    if (value) confirmationTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    else confirmationTrigger.current?.focus();
    updateConfirmation(value);
  }
  useEffect(() => { if (confirmation) confirmationPanel.current?.focus(); }, [confirmation]);
  const manage = Boolean(team && (team.ownerUserId === viewer.id || viewer.role === "organizer"));
  const active = team?.status === "active";

  async function send(path: string, method: string, body: unknown, success: string) {
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error || "Perubahan belum dapat disimpan."); return; }
      setConfirmation(null); setMessage(success); router.refresh();
    } catch { setError("Koneksi terputus. Muat ulang untuk memeriksa perubahan sebelum mencoba lagi."); }
    finally { setPending(false); }
  }
  async function perform(action: TeamAction, success: string) {
    if (team) await send(`/api/teams/${encodeURIComponent(team.id)}`, "PATCH", action, success);
  }
  function submitCreate(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send("/api/teams", "POST", { name }, "Tim berhasil dibuat."); }
  function submitJoin(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send("/api/teams/join", "POST", { code }, "Kamu sudah bergabung dengan tim."); }

  return <div className="team-workspace" aria-busy={pending}>
    {error && <p role="alert" className="form-message">{error}</p>}
    {message && <p role="status" className="form-message">{message}</p>}
    {!team ? <div id="bergabung" className="team-onboarding">
      <section><h2 className="subheading">Mulai tim baru</h2><p className="section-description">Beri nama timmu, lalu bagikan kode bergabung kepada teman. Tidak ada batas anggota.</p>
        <form className="stack-form" onSubmit={submitCreate}><div className="field"><label htmlFor="new-team-name">Nama tim</label><input id="new-team-name" name="name" value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={40} required disabled={pending} /><p className="field-hint">3–40 karakter. Nama tim tampil di scoreboard.</p></div><button className="button" disabled={pending}>{pending ? "Menyimpan…" : "Buat tim"}</button></form>
      </section>
      <section><h2 className="subheading">Sudah punya teman satu tim?</h2><p className="section-description">Minta kode terbaru dari pemilik tim, lalu masukkan di bawah ini.</p>
        <form className="stack-form" onSubmit={submitJoin}><div className="field"><label htmlFor="join-code">Kode bergabung</label><input id="join-code" name="code" value={code} onChange={(event) => setCode(event.target.value)} maxLength={80} required autoComplete="off" spellCheck={false} disabled={pending} /><p className="field-hint">Kode hanya dibagikan oleh pemilik tim atau panitia.</p></div><button className="button button-outline" disabled={pending}>{pending ? "Memeriksa…" : "Gabung tim"}</button></form>
      </section>
    </div> : <>
      <div className="team-summary"><p className="status-label">{active ? "Tim aktif" : "Diarsipkan"}</p><p>{team.members.length} anggota</p><p>Dibuat {formatDate(team.createdAt)} WIB</p></div>
      {manage && active && <div className="team-management">
        <section><h2 className="subheading">Nama tim</h2><form className="stack-form" onSubmit={(event) => { event.preventDefault(); void perform({ action: "rename", name }, "Nama tim disimpan."); }}><div className="field"><label className="visually-hidden" htmlFor="team-name">Nama tim</label><input id="team-name" value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={40} required disabled={pending} /></div><button className="button button-outline" disabled={pending}>Simpan nama tim</button></form></section>
        <section><h2 className="subheading">Undang anggota</h2><p className="field-hint">Hanya pemilik tim dan panitia yang dapat melihat kode ini.</p><code className="invite-code">{team.inviteCode?.match(/.{1,4}/g)?.join(" ")}</code><div className="action-row">
          <button className="button button-outline" disabled={pending} onClick={async () => { try { await navigator.clipboard.writeText(team.inviteCode || ""); setMessage("Kode bergabung disalin."); } catch { setError("Kode belum dapat disalin otomatis. Pilih dan salin kode di atas."); } }}>Salin kode</button>
          <button className="text-button" disabled={pending} onClick={() => setConfirmation({ action: { action: "rotate-invite" }, title: "Ganti kode bergabung?", description: "Kode lama akan berhenti berlaku. Anggota yang sudah bergabung tetap berada di tim.", label: "Ganti kode" })}>Ganti kode</button>
        </div></section>
      </div>}
      <section className="team-section" aria-labelledby="members-title"><div className="section-heading"><h2 id="members-title" className="subheading">Anggota tim</h2><p>Setiap anggota memakai akun sendiri.</p></div>
        {team.members.length === 0 ? <p className="section-description">Semua anggota dikeluarkan saat tim diarsipkan.</p> : <ul className="member-list">{team.members.map((member) => <li key={member.id}>
          <div className="member-identity"><span className="member-avatar" aria-hidden="true">{member.name.charAt(0)}</span><div><p>{member.name}{member.id === viewer.id && <span className="member-you"> (kamu)</span>}</p><span className="field-hint">{member.id === team.ownerUserId ? "Pemilik tim" : "Anggota"}</span></div></div>
          {manage && active && member.id !== team.ownerUserId && <div className="member-actions"><button className="text-button" disabled={pending} onClick={() => setConfirmation({ action: { action: "transfer-owner", userId: member.id }, title: `Alihkan kepemilikan ke ${member.name}?`, description: "Pemilik baru dapat mengelola anggota dan kode bergabung. Pemilik sebelumnya tetap menjadi anggota.", label: "Alihkan kepemilikan" })}>Jadikan pemilik</button><button className="text-button" disabled={pending} onClick={() => setConfirmation({ action: { action: "remove-member", userId: member.id }, title: `Keluarkan ${member.name}?`, description: "Riwayat solve tetap menjadi milik tim. Peserta dapat bergabung kembali menggunakan kode yang berlaku.", label: "Keluarkan anggota" })}>Keluarkan</button></div>}
        </li>)}</ul>}
      </section>
      <section className="team-section" aria-labelledby="activity-title"><h2 id="activity-title" className="subheading">Aktivitas terbaru</h2><ol className="activity-list">{team.events.map((event) => <li key={event.id}><div><p>{eventLabels[event.kind] || "Aktivitas tim"}{event.subjectName && event.kind !== "left" ? `: ${event.subjectName}` : ""}</p><span className="field-hint">Oleh {event.actorName}</span></div><time dateTime={event.createdAt}>{formatDate(event.createdAt)} WIB</time></li>)}</ol></section>
      {active && <section className="team-section team-exit"><h2 className="subheading">Keanggotaan</h2>
        {viewer.role === "participant" && team.ownerUserId !== viewer.id && <><p className="section-description">Kamu dapat pindah tim setelah keluar. Solve dan skor tetap berada pada tim ini.</p><button className="button button-outline" disabled={pending} onClick={() => setConfirmation({ action: { action: "leave" }, title: "Keluar dari tim ini?", description: "Setelah keluar, kamu dapat membuat atau bergabung dengan tim lain. Solve dan skor tidak berpindah.", label: "Keluar dari tim" })}>Keluar dari tim</button></>}
        {manage && <><p className="section-description">{viewer.role === "organizer" ? "Mengarsipkan tim mengeluarkan semua anggota. Riwayat tim tetap tersimpan." : team.members.length === 1 ? "Kamu anggota terakhir. Arsipkan tim untuk keluar. Riwayat tim tetap tersimpan." : "Alihkan kepemilikan ke anggota lain sebelum keluar. Tim dengan anggota lain tidak dapat kamu arsipkan sendiri."}</p><button className="button button-outline" disabled={pending || (viewer.role !== "organizer" && team.members.length !== 1)} onClick={() => setConfirmation({ action: { action: "archive" }, title: "Arsipkan tim ini?", description: "Tim tidak menerima anggota atau submission baru. Semua anggota dikeluarkan; data dan riwayat tim tetap tersimpan.", label: "Arsipkan tim" })}>Arsipkan tim</button></>}
      </section>}
      {confirmation && <section className="confirmation-panel" ref={confirmationPanel} tabIndex={-1} aria-labelledby="confirmation-title"><h2 id="confirmation-title" className="subheading">{confirmation.title}</h2><p>{confirmation.description}</p><div className="action-row"><button className="button" disabled={pending} onClick={() => { void perform(confirmation.action, "Perubahan tim disimpan."); }}>{pending ? "Menyimpan…" : confirmation.label}</button><button className="text-button" disabled={pending} onClick={() => setConfirmation(null)}>Batal</button></div></section>}
    </>}
  </div>;
}
