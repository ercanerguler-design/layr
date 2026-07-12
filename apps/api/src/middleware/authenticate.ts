import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@layr/db";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();

    const payload = request.user as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isPremium: true,
        isVerified: true,
        interestTags: true,
      },
    });

    if (!user) {
      return reply.status(401).send({ success: false, error: "Unauthorized" });
    }

    // Attach full user to request
    request.user = user as never;
  } catch {
    return reply.status(401).send({ success: false, error: "Unauthorized" });
  }
}
