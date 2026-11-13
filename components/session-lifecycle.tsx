"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

/** Let Better Auth refresh deferred sessions in the browser, outside RSC rendering. */
export function SessionLifecycle() {
  const { data, isPending, error } = authClient.useSession();
  const router = useRouter();
  useEffect(() => {
    if (!isPending && !error && data === null) router.refresh();
  }, [data, isPending, error, router]);
  return null;
}
