import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/delete-user.mjs <email>");
  process.exit(1);
}

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const prisma = new PrismaClient();

const { data, error } = await supa.auth.admin.listUsers();
if (error) {
  console.error("listUsers err:", error.message);
  process.exit(1);
}

const u = data.users.find((x) => x.email === target);
if (!u) {
  console.log("Not found:", target);
  await prisma.$disconnect();
  process.exit(0);
}

const r = await supa.auth.admin.deleteUser(u.id);
console.log("Auth user deleted:", u.id, r.error?.message ?? "OK");

const d = await prisma.user.deleteMany({ where: { authId: u.id } });
console.log("Prisma rows deleted:", d.count);

await prisma.$disconnect();
process.exit(0);
