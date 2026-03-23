import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  bindVesselBodySchema,
  manualRefreshBodySchema,
  shipmentRefParamsSchema,
  timelineQuerySchema,
  vesselIimoParamsSchema,
} from "../contracts/maritime.js";
import type { MaritimeApiEnv } from "../config/env.js";
import type { MaritimeReadService } from "../services/maritimeReadService.js";

interface RegisterMaritimeRoutesOptions {
  service: MaritimeReadService;
  env: MaritimeApiEnv;
}

function setCacheHeaders(reply: FastifyReply, value: string): void {
  reply.header("Cache-Control", value);
}

function isAuthorized(request: FastifyRequest, env: MaritimeApiEnv): boolean {
  if (!env.enableWriteEndpoints) {
    return false;
  }

  const headerValue = request.headers["x-maritime-admin-key"];
  const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return !!provided && provided === env.maritimeAdminApiKey;
}

async function requireAdminAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  env: MaritimeApiEnv,
): Promise<boolean> {
  if (!env.enableWriteEndpoints) {
    reply.code(503);
    void reply.send({
      status: "disabled",
      message: "Las escrituras maritimas estan deshabilitadas",
    });
    return false;
  }

  if (!isAuthorized(request, env)) {
    reply.code(401);
    void reply.send({
      status: "unauthorized",
      message: "x-maritime-admin-key invalido o ausente",
    });
    return false;
  }

  return true;
}

export async function registerMaritimeRoutes(
  app: FastifyInstance,
  { service, env }: RegisterMaritimeRoutesOptions,
): Promise<void> {
  app.get("/api/maritime/shipments/:shipmentRef/summary", async (request, reply) => {
    const { shipmentRef } = shipmentRefParamsSchema.parse(request.params);
    const response = await service.getShipmentSummary(shipmentRef);

    if (!response) {
      reply.code(404);
      return {
        status: "not_found",
        message: `No existe el embarque ${shipmentRef}`,
      };
    }

    setCacheHeaders(reply, "max-age=60, stale-while-revalidate=240");
    return response;
  });

  app.get("/api/maritime/shipments/:shipmentRef/latest-snapshot", async (request, reply) => {
    const { shipmentRef } = shipmentRefParamsSchema.parse(request.params);
    const response = await service.getLatestSnapshot(shipmentRef);

    if (!response) {
      reply.code(404);
      return {
        status: "not_found",
        message: `No existe el embarque ${shipmentRef}`,
      };
    }

    setCacheHeaders(reply, "max-age=60, stale-while-revalidate=240");
    return response;
  });

  app.get("/api/maritime/shipments/:shipmentRef/snapshots", async (request, reply) => {
    const { shipmentRef } = shipmentRefParamsSchema.parse(request.params);
    const { window } = timelineQuerySchema.parse(request.query);
    const response = await service.listSnapshots(shipmentRef, window);

    if (!response) {
      reply.code(404);
      return {
        status: "not_found",
        message: `No existe el embarque ${shipmentRef}`,
      };
    }

    setCacheHeaders(reply, "max-age=300");
    return response;
  });

  app.get("/api/maritime/shipments/:shipmentRef/alerts", async (request, reply) => {
    const { shipmentRef } = shipmentRefParamsSchema.parse(request.params);
    const response = await service.listAlerts(shipmentRef);

    if (!response) {
      reply.code(404);
      return {
        status: "not_found",
        message: `No existe el embarque ${shipmentRef}`,
      };
    }

    setCacheHeaders(reply, "max-age=60, stale-while-revalidate=240");
    return response;
  });

  app.get("/api/maritime/vessels/:imo/latest", async (request, reply) => {
    const { imo } = vesselIimoParamsSchema.parse(request.params);
    const response = await service.getLatestByVesselImo(imo);

    setCacheHeaders(reply, "max-age=60, stale-while-revalidate=240");
    return response;
  });

  app.post("/api/maritime/shipments/:shipmentRef/bind-vessel", async (request, reply) => {
    const allowed = await requireAdminAccess(request, reply, env);
    if (!allowed) {
      return reply;
    }

    const { shipmentRef } = shipmentRefParamsSchema.parse(request.params);
    const body = bindVesselBodySchema.parse(request.body);
    const response = await service.bindVessel(shipmentRef, body);

    if (!response) {
      reply.code(404);
      return {
        status: "not_found",
        message: `No existe el embarque ${shipmentRef}`,
      };
    }

    return response;
  });

  app.post("/api/maritime/shipments/:shipmentRef/manual-refresh", async (request, reply) => {
    const allowed = await requireAdminAccess(request, reply, env);
    if (!allowed) {
      return reply;
    }

    const { shipmentRef } = shipmentRefParamsSchema.parse(request.params);
    const body = manualRefreshBodySchema.parse(request.body);
    const response = await service.requestManualRefresh(shipmentRef, body.requestedBy, body.note);

    if (!response) {
      reply.code(404);
      return {
        status: "not_found",
        message: `No existe el embarque ${shipmentRef}`,
      };
    }

    reply.code(response.status === "queued" || response.status === "cooldown" ? 202 : 503);
    return response;
  });
}
