import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  const user = await p.user.update({
    where: { email: "sce@scegrup.com" },
    data: { role: "ADMIN" },
    select: { email: true, username: true, displayName: true, role: true },
  });
  console.log(
    "Admin yapildi:",
    user.email,
    "@" + user.username,
    "| Role:",
    user.role,
  );
  await p.$disconnect();
}

main().catch(console.error);
