import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";
const configurations = [".dev.vars", ".env.production"].flatMap(file => { try { return [parseEnv(readFileSync(file, "utf8"))]; } catch { return []; } });
const sensitive = configurations.flatMap(values => ["BETTER_AUTH_SECRET", "GOOGLE_CLIENT_SECRET", "FLAG_SIGNING_SECRET"].map(key => values[key])).filter(value => value && value.length >= 12);
const files = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
for (const file of files) {
  if (/^\.dev\.vars(?!\.example$)/.test(file)) throw new Error("Private environment file is staged.");
  if (/^\.env(?:\.|$)/.test(file) && !file.endsWith(".example")) throw new Error("Private production configuration is staged.");
  const content = execFileSync("git", ["show", `:${file}`]);
  if (sensitive.some(value => content.includes(Buffer.from(value)))) throw new Error(`Configured secret found in staged file: ${file}`);
}
console.log(`Secret scan passed for ${files.length} staged files. No secret values displayed.`);
