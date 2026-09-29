import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { UserService } from "../services/user.service.js";
import { authenticate } from "../middleware/authenticate.js";

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(300).optional(),
  interestTags: z.array(z.string().max(30)).max(20).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  const userService = new UserService();

  // GET /api/users/:username
  app.get(
    "/:username",
    { schema: { tags: ["users"], summary: "Get user profile by username" } },
    async (request: any, reply: FastifyReply) => {
      const user = await userService.getByUsername(request.params.username);
      if (!user)
        return reply
          .status(404)
          .send({ success: false, error: "User not found" });
      return reply.send({ success: true, data: user });
    },
  );

  // PATCH /api/users/me
  app.patch(
    "/me",
    {
      schema: {
        tags: ["users"],
        summary: "Update current user profile",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request: any, reply: FastifyReply) => {
      const body = updateProfileSchema.parse(request.body);
      const user = await userService.update(request.user.id, body);
      return reply.send({ success: true, data: user });
    },
  );

  // GET /api/users/:username/layers
  app.get(
    "/:username/layers",
    { schema: { tags: ["users"], summary: "Get layers by a user" } },
    async (request: any, reply: FastifyReply) => {
      const { limit = 20, offset = 0 } = request.query;
      const layers = await userService.getLayers(request.params.username, {
        limit: Number(limit),
        offset: Number(offset),
      });
      return reply.send({ success: true, data: layers });
    },
  );

  // POST /api/users/:username/follow
  app.post(
    "/:username/follow",
    {
      schema: {
        tags: ["users"],
        summary: "Follow a user",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request: any, reply) => {
      await userService.follow(request.user.id, request.params.username);
      return reply.send({ success: true });
    },
  );

  // DELETE /api/users/:username/follow
  app.delete(
    "/:username/follow",
    {
      schema: {
        tags: ["users"],
        summary: "Unfollow a user",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request: any, reply) => {
      await userService.unfollow(request.user.id, request.params.username);
      return reply.send({ success: true });
    },
  );
}
