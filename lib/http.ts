export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function jsonBody(request: Request, maximum = 8192): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new RequestError(415, "Gunakan format JSON untuk permintaan ini.");
  // Consume with an explicit bound even when Content-Length is missing or incorrect.
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "Isi permintaan belum lengkap.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new RequestError(413, "Isi permintaan terlalu besar."); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid object");
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, "Isi permintaan tidak valid.");
  } finally { reader.releaseLock(); }
}

export function onlyFields(body: Record<string, unknown>, fields: string[]) {
  if (Object.keys(body).some((key) => !fields.includes(key))) throw new RequestError(400, "Ada isian yang tidak dikenali.");
}

export function mutationOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new RequestError(403, "Permintaan harus berasal dari halaman platform ini.");
}

export function handleRequestError(error: unknown) {
  if (error instanceof RequestError) return jsonResponse({ error: error.message }, error.status);
  console.error(JSON.stringify({ event: "application_request_failed", name: error instanceof Error ? error.name : "UnknownError" }));
  return jsonResponse({ error: "Perubahan belum dapat disimpan. Coba lagi." }, 500);
}
