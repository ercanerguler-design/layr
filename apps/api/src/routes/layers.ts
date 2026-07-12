import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { LayerService } from "../services/layer.service.js";
import { authenticate } from "../middleware/authenticate.js";

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(50).max(10000).default(500),
  type: z.string().optional(),
  year: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(100).default(30),
  offset: z.coerce.number().default(0),
});

const createLayerSchema = z.object({
  locationId: z.string().cuid(),
  title: z.string().max(120).optional(),
  content: z.string().min(1).max(5000),
  type: z.enum([
    "TEXT", "PHOTO", "VIDEO", "AUDIO",
    "AR_OBJECT", "MEMORY", "HISTORICAL", "REVIEW", "EVENT",
  ]),
  year: z.number().int().min(0).max(new Date().getFullYear()).optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string().max(30)).max(10).default([]),
  mediaIds: z.array(z.string().cuid()).max(5).default([]),
});

export async function layerRoutes(app: FastifyInstance) {
  const layerService = new LayerService();

  // GET /api/layers/nearby
  app.get(
    "/nearby",
    {
      schema: {
        tags: ["layers"],
        summary: "Get layers near a coordinate",
        querystring: {
          type: "object",
          required: ["lat", "lng"],
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
            radius: { type: "number" },
            type: { type: "string" },
            year: { type: "number" },
            limit: { type: "number" },
            offset: { type: "number" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = nearbySchema.parse(request.query);
      const result = await layerService.getNearby(query);
      return reply.send({ success: true, data: result });
    }
  );

  // GET /api/layers/:id
  app.get(
    "/:id",
    {
      schema: {
        tags: ["layers"],
        summary: "Get a layer by ID",
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const layer = await layerService.getById(id);
      if (!layer) return reply.status(404).send({ success: false, error: "Layer not found" });
      return reply.send({ success: true, data: layer });
    }
  );

  // POST /api/layers — requires auth
  app.post(
    "/",
    {
      schema: {
        tags: ["layers"],
        summary: "Create a new layer",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createLayerSchema.parse(request.body);
      const layer = await layerService.create(request.user.id, body);
      return reply.status(201).send({ success: true, data: layer });
    }
  );

  // PATCH /api/layers/:id
  app.patch(
    "/:id",
    {
      schema: {
        tags: ["layers"],
        summary: "Update a layer",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const body = createLayerSchema.partial().parse(request.body);
      const layer = await layerService.update(id, request.user.id, body);
      return reply.send({ success: true, data: layer });
    }
  );

  // DELETE /api/layers/:id
  app.delete(
    "/:id",
    {
      schema: {
        tags: ["layers"],
        summary: "Delete a layer",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      await layerService.delete(id, request.user.id);
      return reply.send({ success: true });
    }
  );

  // POST /api/layers/:id/react
  app.post(
    "/:id/react",
    {
      schema: {
        tags: ["layers"],
        summary: "Add reaction to a layer",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { type } = z
        .object({
          type: z.enum(["HEART", "MOVED", "INTERESTING", "FUNNY", "IMPORTANT"]),
        })
        .parse(request.body);
      const result = await layerService.react(id, request.user.id, type);
      return reply.send({ success: true, data: result });
    }
  );

  // GET /api/layers/location/:locationId
  app.get(
    "/location/:locationId",
    {
      schema: {
        tags: ["layers"],
        summary: "Get all layers for a location",
      },
    },
    async (
      request: FastifyRequest<{
        Params: { locationId: string };
        Querystring: { year?: number; type?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { locationId } = request.params;
      const { year, type } = request.query;
      const layers = await layerService.getByLocation(locationId, {
        year: year ? Number(year) : undefined,
        type,
      });
      return reply.send({ success: true, data: layers });
    }
  );
}
