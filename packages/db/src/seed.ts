/**
 * Database seed for LAYR
 * Run: pnpm db:seed
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seed production ortamında çalıştırılamaz.");
  }

  console.log("🌱 Seeding LAYR database...");

  // ─── Demo users ────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("layr1234!", 12);

  const demo = await prisma.user.upsert({
    where: { email: "demo@layr.app" },
    update: {},
    create: {
      email: "demo@layr.app",
      username: "layr_demo",
      displayName: "LAYR Demo",
      passwordHash,
      bio: "LAYR resmi demo hesabı",
      isVerified: true,
      role: "USER",
      interestTags: JSON.stringify(["tarih", "mimari", "kültür"]),
    },
  });

  const ali = await prisma.user.upsert({
    where: { email: "ali@example.com" },
    update: {},
    create: {
      email: "ali@example.com",
      username: "aliyildiz",
      displayName: "Ali Yıldız",
      passwordHash,
      bio: "Tarih meraklısı & fotoğrafçı",
      interestTags: JSON.stringify(["tarih", "osmanlı", "fotoğraf"]),
    },
  });

  // ─── Locations ─────────────────────────────────────────────
  const galataKulesi = await prisma.location.upsert({
    where: { placeId: "ChIJrTLr-GyuyhQRd1dxPqDljXg" },
    update: {},
    create: {
      name: "Galata Kulesi",
      description: "İstanbul'un tarihi simgesi",
      lat: 41.0257,
      lng: 28.9742,
      address: "Bereketzade, Galata Kulesi Sk., 34421",
      city: "İstanbul",
      country: "Türkiye",
      placeId: "ChIJrTLr-GyuyhQRd1dxPqDljXg",
      category: "LANDMARK",
      isVerified: true,
    },
  });

  const anitKabir = await prisma.location.upsert({
    where: { placeId: "ChIJZ5SB3kkWoRQROoAm5JAlm1o" },
    update: {},
    create: {
      name: "Anıtkabir",
      description: "Mustafa Kemal Atatürk'ün anıt mezarı",
      lat: 39.9252,
      lng: 32.8358,
      address: "Anıttepe, Anıtkabir, 06570 Çankaya",
      city: "Ankara",
      country: "Türkiye",
      placeId: "ChIJZ5SB3kkWoRQROoAm5JAlm1o",
      category: "LANDMARK",
      isVerified: true,
    },
  });

  // ─── Layers ────────────────────────────────────────────────
  const layersData = [
    {
      userId: demo.id,
      locationId: galataKulesi.id,
      title: "Galata Kulesi'nin İnşası",
      content:
        "Galata Kulesi, 1348 yılında Cenevizliler tarafından inşa edildi. O dönemde 'Christea Turris' yani 'İsa Kulesi' olarak biliniyordu. Kulenin tepe noktasından İstanbul'un 360 derece manzarası izlenebilir.",
      type: "HISTORICAL",
      year: 1348,
      isPublic: true,
      tags: JSON.stringify(["tarih", "ceneviz", "mimari"]),
    },
    {
      userId: ali.id,
      locationId: galataKulesi.id,
      title: "Evlenme teklifim",
      content:
        "2023 yazında burada sevgilime evlenme teklifi ettim. Kulenin tepesinde gün batımını izlerken... Evet dedi! 🧡",
      type: "MEMORY",
      isPublic: true,
      tags: JSON.stringify(["aşk", "anı", "evlenme teklifi"]),
    },
    {
      userId: demo.id,
      locationId: anitKabir.id,
      title: "10 Kasım 1938",
      content:
        "Mustafa Kemal Atatürk, 10 Kasım 1938'de Dolmabahçe Sarayı'nda hayatını kaybetti. Naaşı önce geçici olarak Etnografya Müzesi'ne taşındı. Anıtkabir 1953'te tamamlandı ve Atatürk'ün naaşı bugünkü yerine nakledildi.",
      type: "HISTORICAL",
      year: 1938,
      isPublic: true,
      tags: JSON.stringify(["atatürk", "tarih", "cumhuriyet"]),
    },
  ];

  for (const layer of layersData) {
    await prisma.layer.create({ data: layer });
  }

  // ─── AI Summaries ──────────────────────────────────────────
  await prisma.aiSummary.upsert({
    where: { locationId: galataKulesi.id },
    update: {},
    create: {
      locationId: galataKulesi.id,
      summary:
        "Galata Kulesi, 1348'den bu yana İstanbul'un ikonik simgesi olmuştur. Asırlık Ceneviz mimarisini barındıran bu yapıda aşk hikayeleri, tarihi anlar ve binlerce anı iç içe geçmektedir.",
      highlights: JSON.stringify([
        "1348'de Cenevizliler tarafından inşa edildi",
        "Burada 2 evlenme teklifi hikayesi var",
        "En çok ziyaret edilen İstanbul simgesi",
      ]),
      sentiment: "nostalgic",
      languages: JSON.stringify(["tr", "en"]),
      layerCount: 2,
    },
  });

  console.log("✅ Seed tamamlandı!");
  console.log(`   Demo kullanıcı: demo@layr.app / layr1234!`);
  console.log(`   ${await prisma.location.count()} lokasyon`);
  console.log(`   ${await prisma.layer.count()} katman`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
