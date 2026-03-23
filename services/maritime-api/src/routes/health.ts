import type { FastifyInstance } from "fastify";

interface RegisterHealthRoutesOptions {
  readyCheck: () => Promise<void>;
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  { readyCheck }: RegisterHealthRoutesOptions,
): Promise<void> {
  app.get("/health", async () => ({
    status: "ok",
    service: "maritime-api",
    timestamp: new Date().toISOString(),
  }));

  app.get("/ready", async (_request, reply) => {
    try {
      await readyCheck();

      return {
        status: "ready",
        service: "maritime-api",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      app.log.error({ err: error }, "Maritime API readiness check failed");
      reply.code(503);
      return {
        status: "not_ready",
        service: "maritime-api",
      };
    }
  });
}
