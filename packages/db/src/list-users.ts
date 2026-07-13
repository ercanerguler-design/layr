import { PrismaClient } from "@prisma/client";

type UserView = {
  email: string;
  username: string;
  displayName: string | null;
  role: string;
  createdAt: Date;
};

const p = new PrismaClient();

async function main() {
  const users: UserView[] = await p.user.findMany({
    select: {
      email: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
  });

  console.log("\n=== Kayıtlı Kullanıcılar ===");
  users.forEach((u: UserView) =>
    console.log(
      `${u.username.padEnd(20)} | ${u.email.padEnd(30)} | ${u.role} | ${u.createdAt.toLocaleDateString("tr-TR")}`,
    ),
  );
  console.log(`\nToplam: ${users.length} kullanıcı`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await p.$disconnect();
  });
