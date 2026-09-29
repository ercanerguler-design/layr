import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@layr/db";
import { config } from "../config.js";

interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  async register(input: RegisterInput) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
    });

    if (existing) {
      if (existing.email === input.email) {
        throw Object.assign(new Error("Email already in use"), {
          statusCode: 409,
        });
      }
      throw Object.assign(new Error("Username already taken"), {
        statusCode: 409,
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isPremium: true,
        isVerified: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id);

    return { user, ...tokens };
  }

  async login(input: LoginInput) {
    // E-posta VEYA kullanıcı adıyla giriş
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: input.email },
          { username: input.email }, // "email" alanına username de yazılabilir
        ],
      },
    });

    if (!user) {
      throw Object.assign(new Error("Invalid credentials"), {
        statusCode: 401,
      });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error("Invalid credentials"), {
        statusCode: 401,
      });
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id);

    const { passwordHash: _ph, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw Object.assign(new Error("Invalid or expired refresh token"), {
        statusCode: 401,
      });
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await this.generateTokens(stored.userId);

    return tokens;
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  private async generateTokens(userId: string) {
    const accessToken = this.app.jwt.sign(
      { sub: userId },
      { expiresIn: config.jwtExpiresIn },
    );

    const refreshToken = this.app.jwt.sign(
      { sub: userId, type: "refresh" },
      {
        expiresIn: config.jwtRefreshExpiresIn,
      },
    );

    // Persist refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }
}
