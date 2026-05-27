import { PrismaClient } from "@prisma/client";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/make-operator.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({ where: { email: target } });
if (!user) {
  console.error(`User not found: ${target}`);
  console.error("(먼저 앱에서 한 번 로그인해서 User row가 생성되어야 합니다.)");
  await prisma.$disconnect();
  process.exit(1);
}

if (user.role === "OPERATOR") {
  console.log(`이미 OPERATOR 입니다: ${target} (id=${user.id})`);
  await prisma.$disconnect();
  process.exit(0);
}

const updated = await prisma.user.update({
  where: { id: user.id },
  data: { role: "OPERATOR" },
});

console.log(`✓ ${updated.email} → OPERATOR (id=${updated.id})`);

await prisma.$disconnect();
process.exit(0);
