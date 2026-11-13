import type { UserRole } from "@/lib/navigation";
import { createAuth } from "./factory";
import type { AuthConfiguration } from "./config";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileComplete: boolean;
};

export function resolveRole(email: string, emailVerified: boolean, organizerEmails: string[]): UserRole {
  return emailVerified && organizerEmails.includes(email.trim().toLowerCase()) ? "organizer" : "participant";
}

export async function readViewer(database: D1Database, configuration: AuthConfiguration | null, requestHeaders: Headers): Promise<Viewer | null> {
  if (!configuration || !requestHeaders.get("cookie")?.includes("ctf.session_token=")) return null;
  const session = await createAuth(database, configuration).api.getSession({ headers: requestHeaders });
  if (!session || session.user.suspended || !session.user.emailVerified) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: resolveRole(session.user.email, session.user.emailVerified, configuration.organizerEmails),
    profileComplete: session.user.profileComplete,
  };
}

export function defaultDestination(role: UserRole) {
  return role === "organizer" ? "/admin" : "/team";
}
