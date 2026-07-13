import { writeFileSync, readFileSync } from "fs";

// Mevcut schema'yı oku ve AiAgent modeli ekle
const current = readFileSync("packages/db/prisma/schema.prisma", "utf8");

const agentModel = `
model AiAgent {
  id          String   @id @default(cuid())
  locationId  String   @unique
  name        String
  title       String?
  persona     String
  greeting    String?
  avatarEmoji String   @default("🤖")
  avatarColor String   @default("#6366f1")
  type        String   @default("NARRATOR")
  voiceLang   String   @default("tr-TR")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@map("ai_agents")
}
`;

// Location modeline aiAgent relation ekle
const updated =
  current.replace(
    `  layers    Layer[]\n  aiSummary AiSummary?`,
    `  layers    Layer[]\n  aiSummary AiSummary?\n  aiAgent   AiAgent?`,
  ) + agentModel;

writeFileSync("packages/db/prisma/schema.prisma", updated, "utf8");
console.log("AiAgent modeli eklendi. Yeni len:", updated.length);
