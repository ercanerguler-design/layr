import { prisma } from "@layr/db";

export class UserService {
  async getByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        isPremium: true,
        isVerified: true,
        role: true,
        interestTags: true,
        createdAt: true,
        _count: {
          select: {
            layers: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      ...user,
      layerCount: user._count.layers,
      followerCount: user._count.followers,
      followingCount: user._count.following,
    };
  }

  async update(userId: string, input: Partial<{
    displayName: string;
    bio: string;
    interestTags: string[];
  }>) {
    return prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        isPremium: true,
        isVerified: true,
        role: true,
        interestTags: true,
      },
    });
  }

  async getLayers(
    username: string,
    opts: { limit: number; offset: number }
  ) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return [];

    return prisma.layer.findMany({
      where: { userId: user.id, isPublic: true },
      include: {
        location: { select: { id: true, name: true, lat: true, lng: true } },
        media: true,
        _count: { select: { reactions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: opts.limit,
      skip: opts.offset,
    });
  }

  async follow(followerId: string, username: string) {
    const following = await prisma.user.findUnique({ where: { username } });
    if (!following) throw Object.assign(new Error("User not found"), { statusCode: 404 });
    if (following.id === followerId)
      throw Object.assign(new Error("Cannot follow yourself"), { statusCode: 400 });

    await prisma.follow.upsert({
      where: {
        followerId_followingId: { followerId, followingId: following.id },
      },
      create: { followerId, followingId: following.id },
      update: {},
    });
  }

  async unfollow(followerId: string, username: string) {
    const following = await prisma.user.findUnique({ where: { username } });
    if (!following) return;

    await prisma.follow.deleteMany({
      where: { followerId, followingId: following.id },
    });
  }
}
