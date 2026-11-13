export const productionSecrets = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "ORGANIZER_EMAILS", "FLAG_SIGNING_SECRET"];
export function validateProduction(config) {
  const errors = [];
  if (config.APP_ENV !== "production") errors.push("APP_ENV harus production.");
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(config.CLOUDFLARE_D1_DATABASE_ID || "") || config.CLOUDFLARE_D1_DATABASE_ID === "3d05ae4a-7641-4bc7-8c46-08edc42f201d") errors.push("Gunakan ID D1 produksi, bukan ID simulasi lokal.");
  for (const field of productionSecrets) if (!config[field]?.trim()) errors.push(`${field} belum diisi.`);
  for (const field of ["BETTER_AUTH_SECRET", "FLAG_SIGNING_SECRET"]) if ((config[field] || "").trim().length < 32) errors.push(`${field} minimal 32 karakter acak.`);
  if (config.BETTER_AUTH_SECRET === config.FLAG_SIGNING_SECRET) errors.push("Gunakan secret berbeda untuk sesi dan flag.");
  try {
    const url = new URL(config.BETTER_AUTH_URL);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || /(^|\.)localhost$|^127\.|^\[::1\]$/.test(url.hostname)) throw new Error();
  } catch { errors.push("BETTER_AUTH_URL harus origin HTTPS produksi tanpa path, query, atau kredensial."); }
  const emails = (config.ORGANIZER_EMAILS || "").split(",").map(value => value.trim()).filter(Boolean);
  if (!emails.length || emails.some(value => !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value))) errors.push("Isi allowlist email panitia yang valid.");
  if (errors.length) throw new Error(errors.join("\n"));
}
