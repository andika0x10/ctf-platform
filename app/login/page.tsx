import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { currentViewer } from "@/lib/auth/server";
import { defaultDestination } from "@/lib/auth/viewer";
import { getAuthConfiguration, safeReturnPath } from "@/lib/auth/config";
import { GoogleSignIn } from "@/components/auth-controls";
import { PixelFlag } from "@/components/pixel-icons";

export const metadata: Metadata = { title: "Masuk" };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function LoginPage({ searchParams }: Props) {
  const query = await searchParams;
  const next = safeReturnPath(query.next);
  const viewer = await currentViewer();
  if (viewer) redirect(viewer.profileComplete ? next || defaultDestination(viewer.role) : `/account${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  const config = getAuthConfiguration(env);
  const baseURL = config?.baseURL || "";
  return <main id="main-content" className="shell interior-page auth-page" tabIndex={-1}>
    <div className="auth-intro"><PixelFlag width="56" height="56" /><h1>Rasa ingin tahu<br />dimulai di sini.</h1><p>Masuk, temukan timmu, dan lanjutkan ke penemuan berikutnya.</p></div>
    <section className="auth-panel" aria-labelledby="login-title"><h2 id="login-title">Masuk ke ruang latihan</h2>
      <p>Gunakan akun Google milikmu. Kamu akan memilih nama tampilan setelah masuk pertama kali.</p>
      {query.error && <p role="alert" className="form-message">Login belum berhasil. Pilih akun Google dan coba lagi.</p>}
      <GoogleSignIn enabled={Boolean(config)} callbackURL={`${baseURL}/account?welcome=1${next ? `&next=${encodeURIComponent(next)}` : ""}`} errorCallbackURL={`${baseURL}/login?error=google`} />
      <p className="field-hint">Satu akun untuk satu peserta. Progres latihan menjadi milik timmu.</p>
    </section>
  </main>;
}
