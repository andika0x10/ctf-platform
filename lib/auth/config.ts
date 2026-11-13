export type AuthConfiguration = {
  secret: string;
  baseURL: string;
  google: { clientId: string; clientSecret: string };
  organizerEmails: string[];
};

type AuthEnvironment = Pick<Cloudflare.Env,
  "APP_ENV" | "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL" |
  "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "ORGANIZER_EMAILS">;

export function getAuthConfiguration(env: AuthEnvironment): AuthConfiguration | null {
  const secret = env.BETTER_AUTH_SECRET?.trim();
  const baseURL = env.BETTER_AUTH_URL?.trim();
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!secret || secret.length < 32 || !baseURL || !clientId || !clientSecret) return null;
  try {
    const url = new URL(baseURL);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(env.APP_ENV === "development" && local && url.protocol === "http:")) return null;
    return {
      secret,
      baseURL: url.origin,
      google: { clientId, clientSecret },
      organizerEmails: (env.ORGANIZER_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
    };
  } catch {
    return null;
  }
}

export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const base = "https://ctf.invalid";
    const url = new URL(value, base);
    if (url.origin !== base || /^\/(?:api|login|account)(?:\/|$)/.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}
