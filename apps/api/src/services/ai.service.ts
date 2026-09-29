import OpenAI from "openai";
import { prisma } from "@layr/db";
import { config } from "../config.js";

export class AiService {
  private openai: OpenAI | null;

  constructor() {
    this.openai = config.openaiApiKey
      ? new OpenAI({ apiKey: config.openaiApiKey })
      : null;
  }

  async getLocationSummary(locationId: string) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        aiSummary: true,
        layers: {
          where: { isPublic: true },
          include: { media: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!location) {
      throw Object.assign(new Error("Location not found"), { statusCode: 404 });
    }

    // Return cached summary if fresh (< 24 hours)
    if (location.aiSummary) {
      const age = Date.now() - location.aiSummary.lastGenerated.getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      if (age < oneDay) return location.aiSummary;
    }

    // Generate fresh summary
    const summary = await this.generateLocationSummary(location);
    return summary;
  }

  private async generateLocationSummary(location: {
    id: string;
    name: string;
    description: string | null;
    layers: Array<{
      content: string;
      type: string;
      year: number | null;
      tags: string | string[];
    }>;
    aiSummary: unknown;
  }) {
    if (!this.openai || location.layers.length === 0) {
      // Fallback without AI
      return prisma.aiSummary.upsert({
        where: { locationId: location.id },
        create: {
          locationId: location.id,
          summary: `${location.name} hakkında ${location.layers.length} hikaye var.`,
          highlights: JSON.stringify([]),
          languages: JSON.stringify(["tr"]),
          layerCount: location.layers.length,
        },
        update: {
          summary: `${location.name} hakkında ${location.layers.length} hikaye var.`,
          highlights: JSON.stringify([]),
          languages: JSON.stringify(["tr"]),
          layerCount: location.layers.length,
          lastGenerated: new Date(),
        },
      });
    }

    const layerTexts = location.layers
      .slice(0, 20)
      .map((l) => `[${l.type}${l.year ? ` - ${l.year}` : ""}]: ${l.content}`)
      .join("\n");

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen LAYR uygulaması için mekân analist yapay zekasısın. Verilen konumdaki insan hikayelerini, tarihsel bilgileri ve yorumları analiz ederek kısa, duygusal ve bilgilendirici Türkçe özetler üretiyorsun.",
        },
        {
          role: "user",
          content: `Konum: ${location.name}
Açıklama: ${location.description ?? "Yok"}

Bu konumda paylaşılan içerikler:
${layerTexts}

Lütfen şunları üret:
1. Bu konumu anlatan 2-3 cümlelik özet (Türkçe)
2. 3 önemli nokta (kısa bullet point'ler)
3. Genel duygu tonu (nostalgic/inspiring/informative/sad/happy)`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message.content ?? "";
    const lines = text.split("\n").filter((l) => l.trim());

    const summary = lines.slice(0, 2).join(" ");
    const highlights = lines
      .filter((l) => l.startsWith("-") || l.startsWith("•") || /^\d\./.test(l))
      .slice(0, 3)
      .map((l) => l.replace(/^[-•\d.]\s*/, "").trim());

    const sentimentMatch = text.match(
      /(nostalgic|inspiring|informative|sad|happy)/i,
    );
    const sentiment = sentimentMatch
      ? sentimentMatch[0].toLowerCase()
      : "informative";

    return prisma.aiSummary.upsert({
      where: { locationId: location.id },
      create: {
        locationId: location.id,
        summary,
        highlights: JSON.stringify(highlights),
        sentiment,
        languages: JSON.stringify(["tr"]),
        layerCount: location.layers.length,
      },
      update: {
        summary,
        highlights: JSON.stringify(highlights),
        sentiment,
        languages: JSON.stringify(["tr"]),
        layerCount: location.layers.length,
        lastGenerated: new Date(),
      },
    });
  }

  async generateNarration(
    locationId: string,
    opts: { year?: number; language: string; mode: string },
  ) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        layers: {
          where: {
            isPublic: true,
            ...(opts.year && { year: { lte: opts.year } }),
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!location) {
      throw Object.assign(new Error("Location not found"), { statusCode: 404 });
    }

    if (!this.openai) {
      return {
        text: `${location.name} — ${location.layers.length} hikaye mevcut.`,
        mode: opts.mode,
        language: opts.language,
      };
    }

    const modeInstruction =
      opts.mode === "children"
        ? "Çocuklara uygun, basit ve eğlenceli bir dil kullan."
        : opts.mode === "academic"
          ? "Akademik ve detaylı bir anlatım kullan."
          : "Normal, akıcı ve ilgi çekici bir dil kullan.";

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Sen LAYR AI rehberisin. ${modeInstruction} Verilen mekân ve içerikler için sesli rehber metni oluştur.`,
        },
        {
          role: "user",
          content: `Mekân: ${location.name}
Hikayeler: ${location.layers.map((l) => l.content).join(" | ")}

Bu mekân için 30-60 saniyelik bir sesli rehber metni yaz (${opts.language} dilinde).`,
        },
      ],
      max_tokens: 400,
    });

    return {
      text: response.choices[0]?.message.content ?? "",
      mode: opts.mode,
      language: opts.language,
    };
  }

  async analyzeProduct(input: {
    barcode?: string;
    productName?: string;
    ingredients?: string;
  }) {
    if (!this.openai) {
      return {
        summary: "AI servisi şu an kullanılamıyor.",
        ingredients: [],
        nutritionScore: 0,
        warnings: [],
        alternatives: [],
      };
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen bir beslenme ve tüketici hakları uzmanısın. Ürün içeriklerini analiz edip tüketiciye faydalı Türkçe bilgi veriyorsun.",
        },
        {
          role: "user",
          content: `Ürün: ${input.productName ?? "Bilinmeyen"}
İçindekiler: ${input.ingredients ?? "Belirtilmemiş"}

Şunları analiz et:
1. Sağlık skoru (0-10)
2. Dikkat edilmesi gereken katkı maddeleri
3. Bu ürüne daha sağlıklı bir alternatif önerisi
4. 2-3 cümlelik özet`,
        },
      ],
      max_tokens: 400,
    });

    const text = response.choices[0]?.message.content ?? "";

    return {
      productName: input.productName ?? "",
      summary: text,
      ingredients: input.ingredients?.split(",").map((i) => i.trim()) ?? [],
      nutritionScore: 5,
      warnings: [],
      alternatives: [],
    };
  }

  async getPersonalizedFeed(
    userId: string,
    opts: { lat: number; lng: number; radius: number },
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { interestTags: true },
    });

    const interests: string[] = user ? JSON.parse(user.interestTags) : [];

    // Bounding box pre-filter then Haversine sort
    const degRadius = (opts.radius / 111_000) * 1.2;
    const candidates = await prisma.layer.findMany({
      where: {
        isPublic: true,
        location: {
          lat: { gte: opts.lat - degRadius, lte: opts.lat + degRadius },
          lng: { gte: opts.lng - degRadius, lte: opts.lng + degRadius },
        },
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
        location: { select: { id: true, name: true, lat: true, lng: true } },
        media: true,
      },
      take: 100,
    });

    const R = 6_371_000;
    const withDist = candidates
      .map((layer) => {
        const dLat = ((layer.location.lat - opts.lat) * Math.PI) / 180;
        const dLng = ((layer.location.lng - opts.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((opts.lat * Math.PI) / 180) *
            Math.cos((layer.location.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...layer, distance };
      })
      .filter((l) => l.distance <= opts.radius);

    const scored = withDist.map((layer) => {
      const tags: string[] = JSON.parse(layer.tags);
      let score = 0;
      if (interests.length > 0) {
        score = interests.filter((i) =>
          tags.map((t) => t.toLowerCase()).includes(i.toLowerCase()),
        ).length;
      }
      return { ...layer, tags, relevanceScore: score };
    });

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scored.slice(0, 20);
  }

  async generateTimeNarration(
    locationId: string,
    year: number,
    language: string,
  ) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        layers: {
          where: { isPublic: true, year: { lte: year }, type: "HISTORICAL" },
          take: 10,
        },
      },
    });

    if (!location) {
      throw Object.assign(new Error("Location not found"), { statusCode: 404 });
    }

    if (!this.openai) {
      return { text: `${location.name} - ${year} yılı`, year, language };
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Sen bir tarih anlatıcısısın. ${year} yılındaki ${location.name} mekânını canlandırıyorsun.`,
        },
        {
          role: "user",
          content: `${location.name} mekânını ${year} yılında ziyaret eden biri için, o yılı yaşatır gibi bir anlatı oluştur (${language} dilinde, 2-3 cümle).`,
        },
      ],
      max_tokens: 300,
    });

    return {
      text: response.choices[0]?.message.content ?? "",
      year,
      language,
    };
  }
}
