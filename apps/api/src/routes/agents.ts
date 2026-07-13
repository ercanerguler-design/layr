import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { prisma } from "@layr/db";
import { authenticate } from "../middleware/authenticate.js";
import OpenAI from "openai";
import { config } from "../config.js";

const openai = config.openaiApiKey
  ? new OpenAI({ apiKey: config.openaiApiKey })
  : null;

const chatSchema = z.object({
  locationId: z.string().cuid(),
  message: z.string().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .default([]),
});

export async function agentRoutes(app: FastifyInstance) {
  // GET /api/agents/:locationId — Lokasyonun AI ajanını getir
  app.get(
    "/:locationId",
    { schema: { tags: ["agents"], summary: "Get AI agent for location" } },
    async (
      request: FastifyRequest<{ Params: { locationId: string } }>,
      reply: FastifyReply,
    ) => {
      const agent = await prisma.aiAgent.findUnique({
        where: { locationId: request.params.locationId },
      });
      if (!agent || !agent.isActive) {
        return reply
          .status(404)
          .send({ success: false, error: "Bu konuma ait AI ajan yok." });
      }
      // Persona'yı gizle (sadece gerekli bilgileri dön)
      const { persona: _, ...safeAgent } = agent;
      return reply.send({ success: true, data: safeAgent });
    },
  );

  // POST /api/agents/chat — Ajanla konuş
  app.post(
    "/chat",
    {
      schema: {
        tags: ["agents"],
        summary: "Chat with a location AI agent",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = chatSchema.parse(request.body);

      const agent = await prisma.aiAgent.findUnique({
        where: { locationId: body.locationId },
        include: {
          location: { select: { name: true, city: true, description: true } },
        },
      });

      if (!agent || !agent.isActive) {
        return reply
          .status(404)
          .send({ success: false, error: "Ajan bulunamadı." });
      }

      // OpenAI yoksa kural tabanlı yanıt ver
      if (!openai) {
        return reply.send({
          success: true,
          data: {
            role: "assistant",
            content: `${agent.greeting ?? `Merhaba! Ben ${agent.name}. ${agent.location.name} hakkında sorularınızı yanıtlamaktan memnuniyet duyarım.`}`,
            agentName: agent.name,
            agentEmoji: agent.avatarEmoji,
          },
        });
      }

      // Sistem promptunu oluştur
      const systemPrompt = `${agent.persona}

Konum bilgisi:
- Yer adı: ${agent.location.name}
- Şehir: ${agent.location.city ?? "Türkiye"}
- Açıklama: ${agent.location.description ?? ""}

Kurallar:
- Rolden çıkma. Sen ${agent.name} karakterisin.
- Kısa ve etkileyici cevaplar ver (1-3 cümle).
- Türkçe konuş.
- Duygusal, samimi ve ilgi çekici ol.
- Sorulmadıkça teknik detaylara girme.`;

      const messages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }> = [
        { role: "system", content: systemPrompt },
        ...body.history.slice(-10),
        { role: "user", content: body.message },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 300,
        temperature: 0.85,
      });

      const reply_content =
        completion.choices[0]?.message.content ?? "Şu an konuşamıyorum.";

      return reply.send({
        success: true,
        data: {
          role: "assistant",
          content: reply_content,
          agentName: agent.name,
          agentEmoji: agent.avatarEmoji,
          agentColor: agent.avatarColor,
        },
      });
    },
  );

  // POST /api/agents — Ajan oluştur (admin)
  app.post(
    "/",
    {
      schema: {
        tags: ["agents"],
        summary: "Create AI agent (admin)",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((request.user as any).role !== "ADMIN") {
        return reply
          .status(403)
          .send({ success: false, error: "Admin gerekli." });
      }

      const schema = z.object({
        locationId: z.string().cuid(),
        name: z.string().min(1).max(60),
        title: z.string().optional(),
        persona: z.string().min(10),
        greeting: z.string().optional(),
        avatarEmoji: z.string().default("🤖"),
        avatarColor: z.string().default("#6366f1"),
        type: z
          .enum(["HISTORICAL", "NARRATOR", "EXPERT", "ASSISTANT", "CHARACTER"])
          .default("NARRATOR"),
        voiceLang: z.string().default("tr-TR"),
      });

      const data = schema.parse(request.body);
      const agent = await prisma.aiAgent.create({ data });
      return reply.status(201).send({ success: true, data: agent });
    },
  );

  // PATCH /api/agents/:id — Ajan güncelle (admin)
  app.patch(
    "/:id",
    {
      schema: {
        tags: ["agents"],
        summary: "Update AI agent (admin)",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((request.user as any).role !== "ADMIN") {
        return reply
          .status(403)
          .send({ success: false, error: "Admin gerekli." });
      }
      const agent = await prisma.aiAgent.update({
        where: { id: request.params.id },
        data: request.body as never,
      });
      return reply.send({ success: true, data: agent });
    },
  );

  // DELETE /api/agents/:id — Ajan sil (admin)
  app.delete(
    "/:id",
    { preHandler: authenticate },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((request.user as any).role !== "ADMIN") {
        return reply
          .status(403)
          .send({ success: false, error: "Admin gerekli." });
      }
      await prisma.aiAgent.delete({ where: { id: request.params.id } });
      return reply.send({ success: true });
    },
  );
}
