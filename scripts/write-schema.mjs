import { writeFileSync } from "fs";

const schema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  displayName  String
  passwordHash String
  avatarUrl    String?
  bio          String?
  isPremium    Boolean  @default(false)
  isVerified   Boolean  @default(false)
  role         String   @default("USER")
  interestTags String   @default("[]")
  pushToken    String?
  lastActiveAt DateTime @default(now())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  layers           Layer[]
  reactions        Reaction[]
  collections      Collection[]
  collectionsItems CollectionItem[]
  following        Follow[]         @relation("Follower")
  followers        Follow[]         @relation("Following")
  notifications    Notification[]
  refreshTokens    RefreshToken[]
  businessProfile  BusinessProfile?

  @@index([email])
  @@index([username])
  @@map("users")
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@map("refresh_tokens")
}

model Location {
  id          String   @id @default(cuid())
  name        String
  description String?
  lat         Float
  lng         Float
  address     String?
  city        String?
  country     String?
  placeId     String?  @unique
  category    String   @default("OTHER")
  isVerified  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  layers    Layer[]
  aiSummary AiSummary?

  @@index([lat, lng])
  @@index([city])
  @@map("locations")
}

model Layer {
  id         String   @id @default(cuid())
  userId     String
  locationId String
  title      String?
  content    String
  type       String   @default("TEXT")
  year       Int?
  isPublic   Boolean  @default(true)
  isPinned   Boolean  @default(false)
  viewCount  Int      @default(0)
  tags       String   @default("[]")
  language   String   @default("tr")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  location  Location   @relation(fields: [locationId], references: [id], onDelete: Cascade)
  media     Media[]
  reactions Reaction[]

  @@index([locationId])
  @@index([userId])
  @@index([type])
  @@index([year])
  @@map("layers")
}

model Media {
  id           String   @id @default(cuid())
  layerId      String
  type         String
  url          String
  thumbnailUrl String?
  duration     Int?
  size         Int?
  width        Int?
  height       Int?
  mimeType     String
  createdAt    DateTime @default(now())

  layer Layer @relation(fields: [layerId], references: [id], onDelete: Cascade)

  @@index([layerId])
  @@map("media")
}

model AiSummary {
  id            String   @id @default(cuid())
  locationId    String   @unique
  summary       String
  highlights    String   @default("[]")
  sentiment     String?
  languages     String   @default("[\\"tr\\"]")
  layerCount    Int      @default(0)
  lastGenerated DateTime @default(now())
  updatedAt     DateTime @updatedAt

  location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@map("ai_summaries")
}

model Reaction {
  id        String   @id @default(cuid())
  userId    String
  layerId   String
  type      String
  createdAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  layer Layer @relation(fields: [layerId], references: [id], onDelete: Cascade)

  @@unique([userId, layerId])
  @@index([layerId])
  @@map("reactions")
}

model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower  User @relation("Follower", fields: [followerId], references: [id], onDelete: Cascade)
  following User @relation("Following", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
  @@map("follows")
}

model Collection {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  isPublic    Boolean  @default(true)
  coverUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user  User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  items CollectionItem[]

  @@index([userId])
  @@map("collections")
}

model CollectionItem {
  id           String   @id @default(cuid())
  collectionId String
  layerId      String
  addedById    String
  note         String?
  order        Int      @default(0)
  createdAt    DateTime @default(now())

  collection Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  addedBy    User       @relation(fields: [addedById], references: [id], onDelete: Cascade)

  @@unique([collectionId, layerId])
  @@map("collection_items")
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  title     String
  body      String
  data      String   @default("{}")
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@map("notifications")
}

model BusinessProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  businessName String
  category     String
  website      String?
  phone        String?
  isVerified   Boolean  @default(false)
  plan         String   @default("free")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("business_profiles")
}
`;

writeFileSync(
  "packages/db/prisma/schema.prisma",
  schema,
  { encoding: "utf8" }
);
console.log("Schema written. Length:", schema.length);
