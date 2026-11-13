import type { BetterAuthOptions } from "better-auth";

/** Shared with the SQL schema generator; authorization is owned by the application. */
export const authSchemaOptions = {
  user: {
    additionalFields: {
      profileComplete: { type: "boolean", required: true, defaultValue: false, input: false },
      suspended: { type: "boolean", required: true, defaultValue: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    deferSessionRefresh: true,
    cookieCache: { enabled: false },
  },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
} satisfies BetterAuthOptions;
