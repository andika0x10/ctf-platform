import { RequestError } from "./http";

export function normalizeFlag(value: unknown) {
  if (typeof value !== "string" || value.length > 512 || !value.trim()) throw new RequestError(400, "Flag harus diisi, maksimal 512 karakter.");
  return value.trim();
}
async function key(secret: string | undefined) {
  if (!secret || secret.length < 32) throw new RequestError(503, "Validasi flag belum tersedia. Hubungi panitia.");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
function message(id: string, flag: string) { return new TextEncoder().encode(`ctf:flag:v1\u0000${id}\u0000${flag}`); }
export async function flagDigest(secret: string | undefined, id: string, flag: unknown) {
  const digest = await crypto.subtle.sign("HMAC", await key(secret), message(id, normalizeFlag(flag)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function verifyFlag(secret: string | undefined, id: string, flag: unknown, digest: string) {
  if (!/^[a-f0-9]{64}$/.test(digest)) return false;
  const bytes = Uint8Array.from(digest.match(/../g)!, (pair) => Number.parseInt(pair, 16));
  return crypto.subtle.verify("HMAC", await key(secret), bytes, message(id, normalizeFlag(flag)));
}
