import { env } from "cloudflare:workers";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };

  try {
    const [database, coordinator] = await Promise.all([
      env.DB.prepare("SELECT value FROM platform_settings WHERE key = ?")
        .bind("schema_version")
        .first<{ value: string }>(),
      env.PARTICIPANT_COORDINATOR.getByName("foundation-health").getStatus(),
    ]);

    if (!database || database.value !== "1" || coordinator.schemaVersion !== 1) {
      return Response.json({ status: "unavailable" }, { status: 503, headers });
    }

    return Response.json({
      status: "ok",
      services: { d1: "ok", durableObjects: "ok" },
      ...(env.APP_ENV === "development" ? { coordinator } : {}),
    }, { headers });
  } catch (error) {
    console.error(JSON.stringify({
      event: "foundation_health_failed",
      message: error instanceof Error ? error.message : "Unknown binding error",
    }));
    return Response.json({ status: "unavailable" }, { status: 503, headers });
  }
}
