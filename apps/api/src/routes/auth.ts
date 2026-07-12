import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AuthService } from "../services/auth.service.js";
import { authenticate } from "../middleware/authenticate.js";

const registerSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(1).max(60),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().min(1), // e-posta veya kullanıcı adı
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);

  // POST /api/auth/register
  app.post(
    "/register",
    {
      schema: {
        tags: ["auth"],
        summary: "Register a new user",
        body: {
          type: "object",
          required: ["email", "username", "displayName", "password"],
          properties: {
            email: { type: "string", format: "email" },
            username: { type: "string" },
            displayName: { type: "string" },
            password: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = registerSchema.parse(request.body);
      const result = await authService.register(body);
      return reply.status(201).send({ success: true, data: result });
    },
  );

  // POST /api/auth/login
  app.post(
    "/login",
    {
      schema: {
        tags: ["auth"],
        summary: "Login with email and password",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body);
      return reply.send({ success: true, data: result });
    },
  );

  // POST /api/auth/refresh
  app.post(
    "/refresh",
    {
      schema: { tags: ["auth"], summary: "Refresh access token" },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { refreshToken } = refreshSchema.parse(request.body);
      const result = await authService.refreshTokens(refreshToken);
      return reply.send({ success: true, data: result });
    },
  );

  // POST /api/auth/logout
  app.post(
    "/logout",
    {
      schema: { tags: ["auth"], summary: "Logout (revoke refresh token)" },
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { refreshToken } = refreshSchema.parse(request.body);
      await authService.logout(refreshToken);
      return reply.send({ success: true });
    },
  );

  // GET /api/auth/me
  app.get(
    "/me",
    {
      schema: {
        tags: ["auth"],
        summary: "Get current user",
        security: [{ bearerAuth: [] }],
      },
      preHandler: authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ success: true, data: request.user });
    },
  );
}
