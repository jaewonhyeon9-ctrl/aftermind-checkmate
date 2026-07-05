import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  let user = await prisma.user.findUnique({
    where: { authId: authUser.id },
  });

  // 자동 부트스트랩: auth는 됐는데 User row가 없는 경우 (회원가입 직후 등)
  if (!user) {
    const name =
      (authUser.user_metadata?.name as string | undefined)?.trim() ||
      authUser.email?.split("@")[0] ||
      "팀원";

    user = await prisma.user.upsert({
      where: { authId: authUser.id },
      create: {
        authId: authUser.id,
        email: authUser.email ?? "",
        name,
      },
      update: {},
    });
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}