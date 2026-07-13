import { PrismaClient } from "@prisma/client";
async function main() {
  const p = new PrismaClient();
  const user = await p.user.update({
    where: { email: "demo@layr.app" },
    data: { email: "sce@scegrup.com" },
    select: { id: true, email: true, username: true, role: true },
  });
  console.log("OK:", user.email, user.username, user.role);
  await p.$disconnect();
}
main().catch(console.error);