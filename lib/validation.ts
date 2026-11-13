import { RequestError } from "./http";

export function displayName(value: unknown, kind: "participant" | "team" = "participant") {
  if (typeof value !== "string") throw new RequestError(400, "Nama belum diisi.");
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  const maximum = kind === "team" ? 40 : 24;
  if ([...name].length < 3 || [...name].length > maximum) throw new RequestError(400, `Nama harus terdiri dari 3–${maximum} karakter.`);
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(name)) throw new RequestError(400, "Gunakan huruf, angka, spasi, titik, garis bawah, atau tanda hubung untuk nama.");
  return name;
}

export function invitationCode(value: unknown) {
  if (typeof value !== "string" || value.length > 80) throw new RequestError(400, "Kode tim tidak valid.");
  const code = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-F0-9]{32}$/.test(code)) throw new RequestError(400, "Periksa kembali kode timmu.");
  return code;
}
