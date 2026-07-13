const path = require("path");
process.env.DATABASE_URL =
  "file:" +
  path.join(__dirname, "..", "packages", "db", "dev.db").replace(/\\/g, "/");
console.log("Using DATABASE_URL=", process.env.DATABASE_URL);
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  try {
    const c = await prisma.location.count();
    console.log("location.count =", c);
    const l = await prisma.location.findMany({ take: 1 });
    console.log("sample location", l);
  } catch (e) {
    console.error("Prisma error:");
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
