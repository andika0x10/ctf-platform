import { requirePageViewer } from "@/lib/auth/server";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageViewer("/admin", { organizer: true, profile: true });
  return children;
}
