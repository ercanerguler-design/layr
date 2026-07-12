import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { LocationService } from "../services/location.service.js";

const searchSchema = z.object({
  q: z.string().min(1).max(100),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().default(10000),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().default(0),
});

const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  placeId: z.string().optional(),
  category: z
    .enum([
      "LANDMARK", "RESTAURANT", "CAFE", "MUSEUM", "PARK", "STREET",
      "BUILDING", "MARKET", "TRANSPORT", "NATURE", "SPORTS", "CEMETERY",
      "EDUCATION", "HOSPITAL", "RELIGIOUS", "GOVERNMENT", "ENTERTAINMENT", "OTHER",
    ])
    .default("OTHER"),
});

export async function locationRoutes(app: FastifyInstance) {
  const locationService = new LocationService();

  // GET /api/locations/search?q=...
  app.get(
    "/search",
    { schema: { tags: ["locations"], summary: "Search locations" } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = searchSchema.parse(request.query);
      const result = await locationService.search(query);
      return reply.send({ success: true, data: result });
    }
  );

  // GET /api/locations/nearby?lat=&lng=&radius=
  app.get(
    "/nearby",
    { schema: { tags: ["locations"], summary: "Get nearby locations" } },
    async (
      request: FastifyRequest<{
        Querystring: { lat: number; lng: number; radius?: number; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      const { lat, lng, radius = 1000, limit = 20 } = request.query;
      const result = await locationService.getNearby({
        lat: Number(lat),
        lng: Number(lng),
        radius: Number(radius),
        limit: Number(limit),
      });
      return reply.send({ success: true, data: result });
    }
  );

  // GET /api/locations/:id
  app.get(
    "/:id",
    { schema: { tags: ["locations"], summary: "Get location by ID" } },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const location = await locationService.getById(request.params.id);
      if (!location) {
        return reply.status(404).send({ success: false, error: "Location not found" });
      }
      return reply.send({ success: true, data: location });
    }
  );

  // POST /api/locations — create (or find existing)
  app.post(
    "/",
    { schema: { tags: ["locations"], summary: "Create or get location" } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createLocationSchema.parse(request.body);
      const location = await locationService.findOrCreate(body);
      return reply.status(201).send({ success: true, data: location });
    }
  );

  // GET /api/locations/:id/time-travel?year=
  app.get(
    "/:id/time-travel",
    {
      schema: {
        tags: ["locations"],
        summary: "Get historical layers for a location at a specific year",
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { year: number };
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const year = Number(request.query.year);
      const result = await locationService.getHistoricalSnapshot(id, year);
      return reply.send({ success: true, data: result });
    }
  );
}
