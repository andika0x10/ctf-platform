import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { parseEnv } from "node:util";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { productionSecrets, validateProduction } from "./production-config.mjs";
let fileConfig = {};
try { fileConfig = parseEnv(readFileSync(".env.production", "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
const configuration = { ...fileConfig, ...process.env };
try { validateProduction(configuration); } catch (error) { console.error(error.message); process.exit(1); }
console.log("Konfigurasi produksi valid. Nilai secret tidak ditampilkan.");
if (process.argv.includes("--check")) process.exit(0);
const env = { ...configuration };
execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url)), "build"], { env, stdio: "inherit" });
const output = JSON.parse(readFileSync(".cloudflare/output/v0/workers/default/worker.config.json", "utf8"));
if (output.env?.APP_ENV?.value !== "production" || output.env?.DB?.id !== configuration.CLOUDFLARE_D1_DATABASE_ID) throw new Error("Build output tidak memakai environment/database produksi yang sudah divalidasi.");
if (output.env?.DB?.type !== "d1" || output.env?.PARTICIPANT_COORDINATOR?.type !== "durable-object" || output.exports?.ParticipantCoordinator?.storage !== "sqlite") throw new Error("Binding penyimpanan build tidak sesuai konfigurasi D1/Durable Objects SQLite.");
if (Object.values(output.env).some(binding => ["r2", "kv", "images"].includes(binding.type))) throw new Error("Build memiliki binding penyimpanan di luar ruang lingkup platform.");
for (const name of productionSecrets) if (output.env?.[name]?.type !== "secret" || "value" in output.env[name]) throw new Error(`Binding ${name} harus tetap berupa secret di build output.`);
if (process.argv.includes("--dry-run")) { console.log("Build produksi selesai; tidak ada resource atau versi yang diunggah."); process.exit(0); }
mkdirSync(".cloudflare", { recursive: true });
const secretsFile = `.cloudflare/deploy-secrets-${randomUUID()}.json`;
try {
  writeFileSync(secretsFile, JSON.stringify(Object.fromEntries(productionSecrets.map(key => [key, configuration[key].trim()]))), { mode: 0o600 });
  execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/cf/bin/cf", import.meta.url)), "deploy", "--prebuilt", "--secrets-file", secretsFile], { env, stdio: "inherit" });
} finally { try { unlinkSync(secretsFile); } catch {} }
