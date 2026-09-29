import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; type?: string };
    user: {
      sub?: string;
      type?: string;
      id: string;
      email: string;
      username: string;
      displayName: string;
      avatarUrl?: string | null;
      role: string;
      isPremium: boolean;
      isVerified: boolean;
      interestTags: string;
    };
  }
}
