"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import type { Viewer } from "@/lib/auth/viewer";

export function GoogleSignIn({ enabled, callbackURL, errorCallbackURL }: { enabled: boolean; callbackURL: string; errorCallbackURL: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function signIn() {
    setPending(true); setError("");
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL, errorCallbackURL });
      if (result.error) { setError("Belum dapat masuk dengan Google. Coba lagi sebentar."); setPending(false); }
    } catch { setError("Koneksi terputus. Periksa jaringanmu dan coba lagi."); setPending(false); }
  }
  return <div className="auth-actions">
    <button type="button" className="button" disabled={!enabled || pending} onClick={signIn}>{pending ? "Menghubungkan…" : "Masuk dengan Google"}</button>
    {!enabled && <p className="field-hint">Login belum tersedia. Hubungi panitia untuk informasi akses.</p>}
    {error && <p role="alert" className="form-message">{error}</p>}
  </div>;
}

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <div className="auth-actions">
    <button className="button button-outline" disabled={pending} onClick={async () => {
      setPending(true); setError("");
      try {
        const result = await authClient.signOut();
        if (result.error) throw new Error("Sign out failed");
        window.location.assign("/");
      } catch { setError("Belum dapat keluar. Periksa koneksimu dan coba lagi."); setPending(false); }
    }}>{pending ? "Keluar…" : "Keluar dari akun"}</button>
    {error && <p role="alert" className="form-message">{error}</p>}
  </div>;
}

export function ProfileForm({ viewer, destination }: { viewer: Viewer; destination: string | null }) {
  const [name, setName] = useState(viewer.profileComplete ? viewer.name : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) { setError(result.error || "Nama belum dapat disimpan."); return; }
      if (destination) { window.location.assign(destination); return; }
      setMessage("Nama tampilan disimpan.");
    } catch { setError("Koneksi terputus. Coba simpan lagi."); }
    finally { setPending(false); }
  }
  return <form className="stack-form" onSubmit={save} aria-busy={pending}>
    <div className="field"><label htmlFor="display-name">Nama tampilan</label>
      <input id="display-name" name="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={3} maxLength={24} autoComplete="nickname" aria-describedby="display-name-hint" disabled={pending} />
      <p id="display-name-hint" className="field-hint">3–24 karakter. Nama ini terlihat oleh anggota tim dan peserta lain.</p>
    </div>
    {error && <p role="alert" className="form-message">{error}</p>}
    {message && <p role="status" className="form-message">{message}</p>}
    <button className="button" disabled={pending}>{pending ? "Menyimpan…" : destination ? "Simpan dan lanjutkan" : "Simpan nama"}</button>
  </form>;
}
