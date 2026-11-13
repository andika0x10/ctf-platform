import application from "vinext/server/fetch-handler";
export * from "vinext/server/fetch-handler";
export { ParticipantCoordinator } from "./lib/durable-objects/participant-coordinator";

export default {
  ...application,
  async fetch(request: Request, env: Cloudflare.Env, context: ExecutionContext) {
    const response: Response = await application.fetch(request, env, context);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    headers.set("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
    if (new URL(request.url).protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
} satisfies ExportedHandler<Cloudflare.Env>;
