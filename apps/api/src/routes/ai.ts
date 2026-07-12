import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AiService } from "../services/ai.service.js";
import { authenticate } from "../middleware/authenticate.js";

const productAnalysisSchema = z.object({
  barcode: z.string().optional(),
  productName: z.string().optional(),
  ingredients: z.string().optional(),
});

export async function aiRoutes(app: FastifyInstance) {
  const aiService = new AiService();

  // GET /api/ai/summary/:locationId — AI summary for a location
  app.get(
    "/summary/:locationId",
    {
      schema: {
        tags: ["ai"],
        summary: "Get or generate AI summary for a location",
      },
    },
    async (
      request: FastifyRequest<{ Params: { locationId: string } }>,
      reply: FastifyReply
    ) => {
      const summary = await aiService.getLocationSummary(request.params.locationId);
      return reply.send({ success: true, data: summary });
    }
  );

  // POST /api/ai/narrate/:locationId — Generate AI narration for a location
  app.post(
    "/narrate/:locationId",
    {
      schema: {
        tags: ["ai"],
        summary: "Generate AI audio narration for a location",
      },
    },
    async (
      request: FastifyRequest<{
        Params: { locationId: string };
        Body: { year?: number; language?: string; mode?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { locationId } = request.params;
      const { year, language = "tr", mode = "normal" } = request.body ?? {};
      const result = await aiService.generateNarration(locationId, {
        year,
        language,
        mode,
      });
      return reply.send({ success: true, data: result });
    }
  );

  // POST /api/ai/product — Analyze product ingredients
  app.post(
    "/product",
    {
      schema: {
        tags: ["ai"],
        summary: "Analyze product ingredients and quality",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = productAnalysisSchema.parse(request.body);
      const result = await aiService.analyzeProduct(body);
      return reply.send({ success: true, data: result });
    }
  );

  // POST /api/ai/personalize — Get personalized nearby recommendations
  app.post(
    "/personalize",
    {
      schema: {
        tags: ["ai"],
        summary: "Get AI-personalized layer recommendations based on interests",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (
      request: FastifyRequest<{
        Body: { lat: number; lng: number; radius?: number };
      }>,
      reply: FastifyReply
    ) => {
      const { lat, lng, radius = 1000 } = request.body;
      const result = await aiService.getPersonalizedFeed(request.user.id, {
        lat,
        lng,
        radius,
      });
      return reply.send({ success: true, data: result });
    }
  );

  // POST /api/ai/time-narrate — Historical narration for time travel
  app.post(
    "/time-narrate",
    {
      schema: {
        tags: ["ai"],
        summary: "Generate narration for time-travel view of a location",
      },
    },
    async (
      request: FastifyRequest<{
        Body: { locationId: string; year: number; language?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { locationId, year, language = "tr" } = request.body;
      const result = await aiService.generateTimeNarration(locationId, year, language);
      return reply.send({ success: true, data: result });
    }
  );
}
