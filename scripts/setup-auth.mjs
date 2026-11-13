import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";

const path = new URL("../.dev.vars", import.meta.url);
let text = existsSync(path) ? readFileSync(path, "utf8") : readFileSync(new URL("../.dev.vars.example", import.meta.url), "utf8");
let values = parseEnv(text);
function set(key, value) {
  const pattern = new RegExp(`^(\\s*(?:export\\s+)?${key}\\s*=).*$`, "m");
  text = pattern.test(text) ? text.replace(pattern, (_, prefix) => prefix + value) : `${text}\n${key}=${value}\n`;
}
if ((values.BETTER_AUTH_SECRET?.trim().length || 0) < 32) set("BETTER_AUTH_SECRET", randomBytes(48).toString("base64url"));
if ((values.FLAG_SIGNING_SECRET?.trim().length || 0) < 32) set("FLAG_SIGNING_SECRET", randomBytes(48).toString("base64url"));
if (!values.BETTER_AUTH_URL?.trim()) set("BETTER_AUTH_URL", "http://localhost:5173");
writeFileSync(path, text);
values = parseEnv(text);
console.log("Local application secret is ready. Its value is not displayed.");
console.log("Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and ORGANIZER_EMAILS in .dev.vars.");
console.log(`Google redirect URI: ${new URL("/api/auth/callback/google", values.BETTER_AUTH_URL).href}`);
