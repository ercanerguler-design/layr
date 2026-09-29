import fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyStatic from "@fastify/static";
import { mkdirSync } from "fs";
import { config } from "./config.js";
import { registerRoutes } from "./routes/index.js";
import { uploadsDir } from "./storage.js";

// Vercel's function filesystem is read-only outside of the temporary directory.
try {
  mkdirSync(uploadsDir, { recursive: true });
} catch {
  /* zaten var */
}

export async function buildApp() {
  const app = fastify({
    logger: {
      level: config.nodeEnv === "production" ? "warn" : "info",
      transport:
        config.nodeEnv !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // ─── Plugins ────────────────────────────────────────────────

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  });

  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100 MB
      files: 5,
    },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    // Redis opsiyonel — dev'de in-memory kullan
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "LAYR API",
        description: "Dünyadaki her yerin bir hikâyesi var.",
        version: "0.1.0",
      },
      servers: [{ url: `http://localhost:${config.port}` }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      tags: [
        { name: "auth", description: "Authentication" },
        { name: "layers", description: "Layer CRUD & discovery" },
        { name: "locations", description: "Location search & details" },
        { name: "users", description: "User profiles" },
        { name: "media", description: "File uploads" },
        { name: "ai", description: "AI features" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { deepLinking: true },
  });

  // ── Static uploads ───────────────────────────────────
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: "/uploads/",
    decorateReply: false,
  });

  // ── Routes ─────────────────────────────────────────────────
  await registerRoutes(app);

  // ─── Health check ───────────────────────────────────────────
  app.get("/health", { schema: { hide: true } }, async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  }));

  return app;
}
