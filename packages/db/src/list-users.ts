import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const users = await p.user.findMany({
  select: {
    email: true,
    username: true,
    displayName: true,
    role: true,
    createdAt: true,
  },
});
console.log("\n=== Kayıtlı Kullanıcılar ===");
users.forEach((u) =>
  console.log(
    `${u.username.padEnd(20)} | ${u.email.padEnd(30)} | ${u.role} | ${u.createdAt.toLocaleDateString("tr-TR")}`,
  ),
);
console.log(`\nToplam: ${users.length} kullanıcı`);
await p.$disconnect();
