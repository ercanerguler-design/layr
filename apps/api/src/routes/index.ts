import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.js";
import { layerRoutes } from "./layers.js";
import { locationRoutes } from "./locations.js";
import { userRoutes } from "./users.js";
import { mediaRoutes } from "./media.js";
import { aiRoutes } from "./ai.js";
import { adminRoutes } from "./admin.js";
import { agentRoutes } from "./agents.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(layerRoutes, { prefix: "/api/layers" });
  await app.register(locationRoutes, { prefix: "/api/locations" });
  await app.register(userRoutes, { prefix: "/api/users" });
  await app.register(mediaRoutes, { prefix: "/api/media" });
  await app.register(aiRoutes, { prefix: "/api/ai" });
  await app.register(adminRoutes, { prefix: "/api/admin" });
  await app.register(agentRoutes, { prefix: "/api/agents" });
}
