import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error("Kullanım: pnpm --filter @layr/db db:make-admin <kayıtlı-e-posta>");
  }

  const p = new PrismaClient();
  try {
    const user = await p.user.update({
      where: { email },
      data: { role: "ADMIN" },
      select: { email: true, username: true, displayName: true, role: true },
    });
    console.log(`Admin yetkisi verildi: ${user.email} (@${user.username})`);
  } finally {
    await p.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
