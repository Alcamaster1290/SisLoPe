import type { FastifyInstance, FastifyReply } from "fastify";
import { heatmapDailyQuerySchema } from "../contracts/maritimeHeatmap.js";
import type { MaritimeHeatmapReadService } from "../services/maritimeHeatmapReadService.js";

interface RegisterMaritimeHeatmapRoutesOptions {
  service: MaritimeHeatmapReadService;
}

function setCacheHeaders(reply: FastifyReply, value: string): void {
  reply.header("Cache-Control", value);
}

export async function registerMaritimeHeatmapRoutes(
  app: FastifyInstance,
  { service }: RegisterMaritimeHeatmapRoutesOptions,
): Promise<void> {
  app.get("/api/maritime/heatmap/latest", async (_request, reply) => {
    const response = await service.getLatestSnapshot();
    setCacheHeaders(reply, "max-age=3600, stale-while-revalidate=21600");
    return response;
  });

  app.get("/api/maritime/heatmap/daily", async (request, reply) => {
    const { date } = heatmapDailyQuerySchema.parse(request.query);
    const response = await service.getDailySnapshot(date);
    setCacheHeaders(reply, "max-age=21600, stale-while-revalidate=21600");
    return response;
  });

  app.get("/api/maritime/heatmap/coverage", async (_request, reply) => {
    const response = await service.getCoverage();
    setCacheHeaders(reply, "max-age=3600, stale-while-revalidate=21600");
    return response;
  });
}
