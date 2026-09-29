import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("file:") ||
        value.startsWith("postgresql://") ||
        value.startsWith("postgres://"),
      {
        message:
          "DATABASE_URL must be a SQLite file: URL or PostgreSQL connection string.",
      },
    ),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  OPENAI_API_KEY: z.string().optional().default(""),
  AWS_ACCESS_KEY_ID: z.string().default("minioadmin"),
  AWS_SECRET_ACCESS_KEY: z.string().default("minioadmin"),
  AWS_S3_BUCKET: z.string().default("layr-media"),
  AWS_S3_ENDPOINT: z.string().default("http://localhost:9000"),
  AWS_S3_REGION: z.string().default("us-east-1"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

if (env.NODE_ENV === "production" && env.DATABASE_URL.startsWith("file:")) {
  console.error("DATABASE_URL must use PostgreSQL in production.");
  process.exit(1);
}

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  redisUrl: env.REDIS_URL,
  jwtSecret: env.JWT_SECRET,
  jwtRefreshSecret: env.JWT_REFRESH_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  openaiApiKey: env.OPENAI_API_KEY,
  s3: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    bucket: env.AWS_S3_BUCKET,
    endpoint: env.AWS_S3_ENDPOINT,
    region: env.AWS_S3_REGION,
  },
  corsOrigins: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
} as const;
