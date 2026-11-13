import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { authSchemaOptions } from "./schema";
import type { AuthConfiguration } from "./config";

/** Construct per request: never retain a request's D1 binding in a module singleton. */
export function createAuth(database: D1Database, configuration: AuthConfiguration) {
  return betterAuth({
    ...authSchemaOptions,
    appName: "CTF Platform",
    database,
    baseURL: configuration.baseURL,
    secret: configuration.secret,
    trustedOrigins: [configuration.baseURL],
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        ...configuration.google,
        overrideUserInfoOnSignIn: false,
        mapProfileToUser: () => ({ name: "Peserta" }),
      },
    },
    user: {
      ...authSchemaOptions.user,
      validateUserInfo: ({ user, source }) => {
        if (source.oauth?.providerId !== "google" || !user.emailVerified) {
          return { error: "verified_google_account_required", errorDescription: "Gunakan akun Google dengan email terverifikasi." };
        }
      },
    },
    account: { accountLinking: { enabled: false } },
    advanced: {
      cookiePrefix: "ctf",
      useSecureCookies: configuration.baseURL.startsWith("https:"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      disableOriginCheck: false,
      disableCSRFCheck: false,
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    disabledPaths: ["/update-user", "/change-email", "/delete-user", "/link-social", "/unlink-account", "/get-access-token", "/refresh-token"],
    databaseHooks: {
      user: { create: { before: async (user) => {
        const registration = await database.prepare("SELECT value FROM platform_settings WHERE key = 'registration_open'").first<{ value: string }>();
        if (registration?.value !== "true") throw new APIError("FORBIDDEN", { message: "Pendaftaran sedang ditutup." });
        return { data: { ...user, name: "Peserta", image: null, profileComplete: false, suspended: false } };
      } } },
      session: { create: { before: async (session) => {
        const user = await database.prepare('SELECT suspended, emailVerified FROM "user" WHERE id = ?').bind(session.userId).first<{ suspended: number; emailVerified: number }>();
        if (!user || user.suspended || !user.emailVerified) throw new APIError("FORBIDDEN", { message: "Akun tidak dapat mengakses latihan." });
        return { data: session };
      } } },
    },
    telemetry: { enabled: false },
    // Vendor messages can contain callback URLs. Keep credentials and URL queries out of logs.
    logger: {
      level: "warn",
      log: (level) => {
        const entry = JSON.stringify({ event: "better_auth", level });
        if (level === "error") console.error(entry);
        else if (level === "warn") console.warn(entry);
      },
    },
  });
}
