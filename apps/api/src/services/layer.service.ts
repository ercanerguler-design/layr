import { prisma } from "@layr/db";

/**
 * Haversine formula — Earth radius 6371 km
 * Returns distance in metres between two coordinates.
 */
function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SELECT_USER = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isVerified: true,
  isPremium: true,
} as const;

interface NearbyQuery {
  lat: number;
  lng: number;
  radius: number;
  type?: string;
  year?: number;
  limit: number;
  offset: number;
}

interface CreateLayerInput {
  locationId: string;
  title?: string;
  content: string;
  type: string;
  year?: number;
  isPublic?: boolean;
  tags?: string[];
  mediaIds?: string[];
}

export class LayerService {
  async getNearby(query: NearbyQuery) {
    // Bounding box pre-filter (fast) then exact Haversine sort
    const degRadius = (query.radius / 111_000) * 1.2;

    const candidates = await prisma.layer.findMany({
      where: {
        isPublic: true,
        ...(query.type && { type: query.type }),
        ...(query.year && { year: query.year }),
        location: {
          lat: { gte: query.lat - degRadius, lte: query.lat + degRadius },
          lng: { gte: query.lng - degRadius, lte: query.lng + degRadius },
        },
      },
      include: {
        user: { select: SELECT_USER },
        location: { select: { id: true, name: true, lat: true, lng: true } },
        media: true,
        _count: { select: { reactions: true } },
      },
      take: 200,
    });

    const withDistance = candidates
      .map((layer) => ({
        ...layer,
        distance: Math.round(
          haversineMetres(query.lat, query.lng, layer.location.lat, layer.location.lng)
        ),
        reactionCount: layer._count.reactions,
        tags: JSON.parse(layer.tags) as string[],
      }))
      .filter((l) => l.distance <= query.radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(query.offset, query.offset + query.limit);

    return { items: withDistance, total: withDistance.length };
  }

  async getById(id: string) {
    const layer = await prisma.layer.findUnique({
      where: { id },
      include: {
        user: { select: SELECT_USER },
        location: { select: { id: true, name: true, lat: true, lng: true, category: true } },
        media: true,
        _count: { select: { reactions: true } },
      },
    });

    if (!layer) return null;

    void prisma.layer.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      ...layer,
      reactionCount: layer._count.reactions,
      tags: JSON.parse(layer.tags) as string[],
    };
  }

  async create(userId: string, input: CreateLayerInput) {
    const layer = await prisma.layer.create({
      data: {
        userId,
        locationId: input.locationId,
        title: input.title,
        content: input.content,
        type: input.type,
        year: input.year,
        isPublic: input.isPublic ?? true,
        tags: JSON.stringify(input.tags ?? []),
      },
      include: {
        user: { select: SELECT_USER },
        location: { select: { id: true, name: true, lat: true, lng: true } },
        media: true,
      },
    });

    if (input.mediaIds && input.mediaIds.length > 0) {
      await prisma.media.updateMany({
        where: { id: { in: input.mediaIds } },
        data: { layerId: layer.id },
      });
    }

    return { ...layer, tags: input.tags ?? [] };
  }

  async update(id: string, userId: string, input: Partial<CreateLayerInput>) {
    const layer = await prisma.layer.findUnique({ where: { id } });
    if (!layer) throw Object.assign(new Error("Layer not found"), { statusCode: 404 });
    if (layer.userId !== userId)
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });

    return prisma.layer.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content && { content: input.content }),
        ...(input.type && { type: input.type }),
        ...(input.year !== undefined && { year: input.year }),
        ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
        ...(input.tags && { tags: JSON.stringify(input.tags) }),
      },
      include: { media: true },
    });
  }

  async delete(id: string, userId: string) {
    const layer = await prisma.layer.findUnique({ where: { id } });
    if (!layer) throw Object.assign(new Error("Layer not found"), { statusCode: 404 });
    if (layer.userId !== userId)
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });

    await prisma.layer.delete({ where: { id } });
  }

  async react(layerId: string, userId: string, type: string) {
    const existing = await prisma.reaction.findUnique({
      where: { userId_layerId: { userId, layerId } },
    });

    if (existing) {
      if (existing.type === type) {
        await prisma.reaction.delete({
          where: { userId_layerId: { userId, layerId } },
        });
        return { reacted: false };
      }
      await prisma.reaction.update({
        where: { userId_layerId: { userId, layerId } },
        data: { type },
      });
      return { reacted: true, type };
    }

    await prisma.reaction.create({ data: { userId, layerId, type } });
    return { reacted: true, type };
  }

  async getByLocation(locationId: string, filters: { year?: number; type?: string }) {
    const layers = await prisma.layer.findMany({
      where: {
        locationId,
        isPublic: true,
        ...(filters.year && { year: filters.year }),
        ...(filters.type && { type: filters.type }),
      },
      include: {
        user: { select: SELECT_USER },
        media: true,
        _count: { select: { reactions: true } },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    return layers.map((l) => ({
      ...l,
      tags: JSON.parse(l.tags) as string[],
      reactionCount: l._count.reactions,
    }));
  }
}
