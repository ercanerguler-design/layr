/**
 * Admin şifresini değiştir
 * Kullanım: npx tsx src/change-password.ts demo@layr.app YeniSifre123!
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

async function main() {
  const [, , emailOrUsername, newPassword] = process.argv;

  if (!emailOrUsername || !newPassword) {
    console.error(
      "Kullanım: npx tsx src/change-password.ts <email_veya_username> <yeni_sifre>",
    );
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error("Şifre en az 8 karakter olmalı.");
    process.exit(1);
  }

  const p = new PrismaClient();
  const user = await p.user.findFirst({
    where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
  });

  if (!user) {
    console.error(`Kullanıcı bulunamadı: ${emailOrUsername}`);
    await p.$disconnect();
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await p.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

  console.log(`✅ Şifre güncellendi!`);
  console.log(`   Kullanıcı: ${user.displayName} (@${user.username})`);
  console.log(`   E-posta:   ${user.email}`);
  console.log(`   Yeni şifre ile giriş yapabilirsin.`);

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
