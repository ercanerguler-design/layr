# LAYR 🌍

> **"Dünyadaki her yerin bir hikâyesi var."**

LAYR, gerçek dünyanın üzerine yerleştirilmiş yapay zeka destekli bir dijital katman platformudur. Google Maps sana 4.7 yıldız gösterir. LAYR sana **"burada biri evlenme teklifi etti"** der.

---

## Mimari

```
layr/
├── apps/
│   ├── api/          # Fastify + TypeScript REST API
│   ├── web/          # Next.js 14 web uygulaması  
│   └── mobile/       # Expo React Native AR uygulaması
├── packages/
│   ├── db/           # Prisma ORM + PostgreSQL/PostGIS şeması
│   └── types/        # Paylaşılan TypeScript tipleri
└── docker/           # Docker Compose servisleri
```

**Tech Stack:**
- **Monorepo:** Turborepo + pnpm workspaces
- **API:** Fastify 4, TypeScript, Zod validation, JWT auth
- **Veritabanı:** PostgreSQL 16 + PostGIS (coğrafi sorgular), Redis (cache/rate-limit)
- **ORM:** Prisma 5 (type-safe, migration desteği)
- **Web:** Next.js 14 (App Router), Tailwind CSS, Mapbox GL, React Query
- **Mobil:** Expo SDK 51, React Native, AR kamera, Expo Location/Sensors
- **AI:** OpenAI GPT-4o-mini (özet, anlatı, ürün analizi, kişiselleştirme)
- **Depolama:** S3-uyumlu MinIO (yerel dev), AWS S3 (prod)

---

## Hızlı Başlangıç

### 1. Önkoşullar

```bash
node >= 20
pnpm >= 9
docker & docker-compose
```

### 2. Bağımlılıkları kur

```bash
pnpm install
```

### 3. Ortam değişkenlerini ayarla

```bash
cp .env.example .env
# .env dosyasını düzenle (JWT_SECRET, OPENAI_API_KEY, vb.)
```

### 4. Altyapıyı başlat (PostgreSQL + Redis + MinIO)

```bash
docker-compose up -d
```

### 5. Veritabanı şemasını oluştur ve seed et

```bash
pnpm db:generate    # Prisma client üret
pnpm db:push        # Şemayı DB'ye uygula
pnpm -F @layr/db db:seed  # Demo verisi ekle
```

### 6. Geliştirme sunucularını başlat

```bash
pnpm dev
```

Bu komut şunları paralel başlatır:
- **API:** http://localhost:3001 (Swagger: http://localhost:3001/docs)
- **Web:** http://localhost:3000
- **Mobile:** Expo Dev Server (QR kod ile telefona bağlan)

---

## Temel API Endpointleri

```
POST   /api/auth/register         Kayıt
POST   /api/auth/login            Giriş
GET    /api/auth/me               Oturum bilgisi

GET    /api/layers/nearby         Yakındaki katmanlar (lat/lng/radius)
POST   /api/layers                Yeni katman oluştur
GET    /api/layers/:id            Katman detayı
POST   /api/layers/:id/react      Reaksiyon ekle

GET    /api/locations/nearby      Yakındaki konumlar
GET    /api/locations/search      Konum ara
GET    /api/locations/:id/time-travel  Zaman yolculuğu (year param)

GET    /api/ai/summary/:locationId     AI özet
POST   /api/ai/narrate/:locationId     Sesli rehber metni
POST   /api/ai/product                 Ürün analizi
POST   /api/ai/personalize             Kişiselleştirilmiş feed
POST   /api/ai/time-narrate            Tarihsel anlatı

POST   /api/media/upload          Dosya yükle
POST   /api/media/presign         Presigned URL al
```

---

## Veritabanı Modelleri

```
User        → Layer []    (1:N)
Location    → Layer []    (1:N, PostGIS lat/lng)
Layer       → Media []    (1:N)
Layer       → Reaction [] (N:N via users)
Location    → AiSummary   (1:1)
User        → Follow []   (N:N self-referential)
User        → Collection → CollectionItem → Layer
```

---

## Ana Özellikler

| Özellik | Durum |
|---------|-------|
| AR Kamera (Expo Camera + Compass) | ✅ |
| Konum bazlı layer keşfi (PostGIS) | ✅ |
| Zaman yolculuğu slider | ✅ |
| AI lokasyon özeti (GPT-4o-mini) | ✅ |
| AI sesli rehber | ✅ |
| AI ürün analizi | ✅ |
| AI kişiselleştirilmiş feed | ✅ |
| JWT auth + refresh token rotation | ✅ |
| S3/MinIO medya yükleme | ✅ |
| Reaksiyon sistemi | ✅ |
| Takip sistemi | ✅ |
| Koleksiyonlar | ✅ (DB) |
| Push bildirimler | 🔜 |
| 3D AR nesneler | 🔜 |
| Sesli kayıt | 🔜 |

---

## Para Kazanma Modeli

- **Premium üyelik:** Çevrimdışı rehber, gelişmiş AI, özel katman tasarımları
- **İşletme profilleri:** Doğrulanmış profil, analitik dashboard
- **Kurumsal:** Belediyeler, müzeler, turizm şirketleri için özel paketler
- **API:** Üçüncü taraf entegrasyon API'si
- **Sponsorlu içerik:** Şeffaf etiketli konumsal reklamlar

---

## Demo Hesabı

```
Email:    demo@layr.app
Şifre:    layr1234!
```
