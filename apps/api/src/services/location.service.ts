import type { Media } from "@layr/db";
import { prisma } from "@layr/db";

function haversineMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface SearchQuery {
  q: string;
  lat?: number;
  lng?: number;
  radius?: number;
  category?: string;
  limit: number;
  offset: number;
}

interface NearbyQuery {
  lat: number;
  lng: number;
  radius: number;
  limit: number;
}

interface CreateLocationInput {
  name: string;
  description?: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  country?: string;
  placeId?: string;
  category?: string;
}

export class LocationService {
  async search(query: SearchQuery) {
    const locations = await prisma.location.findMany({
      where: {
        OR: [
          { name: { contains: query.q } },
          { address: { contains: query.q } },
          { city: { contains: query.q } },
        ],
        ...(query.category && { category: query.category }),
      },
      include: { _count: { select: { layers: true } }, aiSummary: true },
      take: query.limit,
      skip: query.offset,
    });

    return {
      items: locations.map((l) => ({ ...l, layerCount: l._count.layers })),
      total: locations.length,
    };
  }

  async getNearby(query: NearbyQuery) {
    const degRadius = (query.radius / 111_000) * 1.2;

    const candidates = await prisma.location.findMany({
      where: {
        lat: { gte: query.lat - degRadius, lte: query.lat + degRadius },
        lng: { gte: query.lng - degRadius, lte: query.lng + degRadius },
      },
      include: { _count: { select: { layers: true } }, aiSummary: true },
      take: 200,
    });

    return candidates
      .map((l) => ({
        ...l,
        layerCount: l._count.layers,
        distance: Math.round(
          haversineMetres(query.lat, query.lng, l.lat, l.lng),
        ),
      }))
      .filter((l) => l.distance <= query.radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, query.limit);
  }

  async getById(id: string) {
    const location = await prisma.location.findUnique({
      where: { id },
      include: { _count: { select: { layers: true } }, aiSummary: true },
    });

    if (!location) return null;
    return { ...location, layerCount: location._count.layers };
  }

  async findOrCreate(input: CreateLocationInput) {
    if (input.placeId) {
      const existing = await prisma.location.findUnique({
        where: { placeId: input.placeId },
        include: { _count: { select: { layers: true } } },
      });
      if (existing) return { ...existing, layerCount: existing._count.layers };
    }

    // Check for very close existing location (within 30m)
    const degRadius = 30 / 111_000;
    const near = await prisma.location.findFirst({
      where: {
        lat: { gte: input.lat - degRadius, lte: input.lat + degRadius },
        lng: { gte: input.lng - degRadius, lte: input.lng + degRadius },
      },
      include: { _count: { select: { layers: true } } },
    });
    if (near) return { ...near, layerCount: near._count.layers };

    const location = await prisma.location.create({
      data: {
        name: input.name,
        description: input.description,
        lat: input.lat,
        lng: input.lng,
        address: input.address,
        city: input.city,
        country: input.country,
        placeId: input.placeId,
        category: input.category ?? "OTHER",
      },
      include: { _count: { select: { layers: true } } },
    });

    return { ...location, layerCount: 0 };
  }

  async getHistoricalSnapshot(locationId: string, year: number) {
    const layers = await prisma.layer.findMany({
      where: {
        locationId,
        isPublic: true,
        year: { lte: year },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            isPremium: true,
          },
        },
        media: true,
        _count: { select: { reactions: true } },
      },
      orderBy: { year: "asc" },
    });

    return {
      year,
      layers: layers.map((l) => ({
        ...l,
        tags: JSON.parse(l.tags) as string[],
        reactionCount: l._count.reactions,
      })),
      imageCount: layers.filter(
        (l) =>
          l.type === "PHOTO" || l.media.some((m: Media) => m.type === "IMAGE"),
      ).length,
      videoCount: layers.filter(
        (l) =>
          l.type === "VIDEO" || l.media.some((m: Media) => m.type === "VIDEO"),
      ).length,
      aiNarration: null,
    };
  }
}
