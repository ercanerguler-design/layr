import type { FastifyInstance, FastifyReply } from "fastify";
import { prisma } from "@layr/db";
import { authenticate } from "../middleware/authenticate.js";

async function requireAdmin(request: any, reply: FastifyReply) {
  await authenticate(request, reply);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((request.user as any).role !== "ADMIN") {
    return reply
      .status(403)
      .send({ success: false, error: "Admin yetkisi gerekiyor." });
  }
}

export async function adminRoutes(app: FastifyInstance) {
  // GET /api/admin/stats/users
  app.get("/stats/users", { preHandler: requireAdmin }, async (_req, reply) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, premium, verified] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.user.count({ where: { isVerified: true } }),
    ]);

    return reply.send({
      success: true,
      data: { total, today: todayCount, premium, verified },
    });
  });

  // GET /api/admin/stats/layers
  app.get(
    "/stats/layers",
    { preHandler: requireAdmin },
    async (_req, reply) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [total, todayCount, grouped] = await Promise.all([
        prisma.layer.count(),
        prisma.layer.count({ where: { createdAt: { gte: today } } }),
        prisma.layer.groupBy({ by: ["type"], _count: { id: true } }),
      ]);

      const byType: Record<string, number> = {};
      for (const g of grouped) {
        byType[g.type] = g._count.id;
      }

      return reply.send({
        success: true,
        data: { total, today: todayCount, byType },
      });
    },
  );

  // GET /api/admin/stats/locations
  app.get(
    "/stats/locations",
    { preHandler: requireAdmin },
    async (_req, reply) => {
      const total = await prisma.location.count();
      const cities = await prisma.location.findMany({
        select: { city: true },
        distinct: ["city"],
        where: { city: { not: null } },
      });

      return reply.send({
        success: true,
        data: { total, cities: cities.length },
      });
    },
  );

  // GET /api/admin/recent/layers
  app.get(
    "/recent/layers",
    { preHandler: requireAdmin },
    async (_req, reply) => {
      const layers = await prisma.layer.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { username: true, displayName: true } },
          location: { select: { name: true } },
        },
      });

      return reply.send({ success: true, data: layers });
    },
  );

  // GET /api/admin/recent/users
  app.get(
    "/recent/users",
    { preHandler: requireAdmin },
    async (_req, reply) => {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          createdAt: true,
          isPremium: true,
        },
      });

      return reply.send({ success: true, data: users });
    },
  );

  // DELETE /api/admin/layers/:id
  app.delete(
    "/layers/:id",
    { preHandler: requireAdmin },
    async (request: any, reply) => {
      await prisma.layer.delete({ where: { id: request.params.id } });
      return reply.send({ success: true });
    },
  );

  // PATCH /api/admin/users/:id/role
  app.patch(
    "/users/:id/role",
    { preHandler: requireAdmin },
    async (request: any, reply) => {
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { role: request.body.role as never },
        select: { id: true, username: true, role: true },
      });
      return reply.send({ success: true, data: user });
    },
  );

  // PATCH /api/admin/users/:id/premium — Premium / Verified toggle
  app.patch(
    "/users/:id/premium",
    { preHandler: requireAdmin },
    async (request: any, reply) => {
      const { isPremium, isVerified } = request.body;
      const data: Record<string, boolean> = {};
      if (isPremium !== undefined) data["isPremium"] = isPremium;
      if (isVerified !== undefined) data["isVerified"] = isVerified;

      const user = await prisma.user.update({
        where: { id: request.params.id },
        data,
        select: {
          id: true,
          username: true,
          displayName: true,
          isPremium: true,
          isVerified: true,
          role: true,
        },
      });
      return reply.send({ success: true, data: user });
    },
  );

  // GET /api/admin/users — Tüm kullanıcılar (yönetim için)
  app.get("/users", { preHandler: requireAdmin }, async (request: any, reply) => {
    const page = Number(request.query.page ?? 1);
    const q = request.query.q ?? "";
    const take = 20;

    const where = q
      ? {
          OR: [
            { username: { contains: q } },
            { email: { contains: q } },
            { displayName: { contains: q } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip: (page - 1) * take,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          isPremium: true,
          isVerified: true,
          createdAt: true,
          lastActiveAt: true,
          _count: { select: { layers: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        users: users.map((u) => ({ ...u, layerCount: u._count.layers })),
        total,
        page,
        pages: Math.ceil(total / take),
      },
    });
  });

  // DELETE /api/admin/users/:id — Kullanıcı sil
  app.delete(
    "/users/:id",
    { preHandler: requireAdmin },
    async (request: any, reply) => {
      await prisma.user.delete({ where: { id: request.params.id } });
      return reply.send({ success: true });
    },
  );
}
