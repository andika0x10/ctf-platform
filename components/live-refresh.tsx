"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  return <p className="field-hint">Diperbarui otomatis setiap 30 detik selama halaman terbuka.</p>;
}
