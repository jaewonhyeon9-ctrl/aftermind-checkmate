import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
  name: z.string().min(1).max(40),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 입력" }, { status: 400 });
  }

  const { email, password, name } = parsed.data;
  const admin = createAdminClient();

  // Admin API로 사용자 생성 (이메일 확인 자동 처리)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    // 이미 가입된 이메일 케이스
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists") ||
      error.code === "email_exists"
    ) {
      return NextResponse.json(
        { error: "이미 가입된 이메일이에요. 로그인해주세요." },
        { status: 409 }
      );
    }
    if (msg.includes("password")) {
      return NextResponse.json(
        { error: "비밀번호는 6자 이상이어야 해요." },
        { status: 400 }
      );
    }
    if (msg.includes("rate") || msg.includes("too many")) {
      return NextResponse.json(
        { error: "보안상 잠시 후 다시 시도해주세요 (60초)" },
        { status: 429 }
      );
    }
    // 디버깅용 — 모르는 에러는 그대로 반환
    return NextResponse.json(
      { error: `가입 실패: ${error.message ?? "알 수 없는 오류"}` },
      { status: 500 }
    );
  }

  if (!data.user) {
    return NextResponse.json({ error: "사용자 생성 실패" }, { status: 500 });
  }

  // User row 즉시 부트스트랩 (첫 가입자 = OPERATOR)
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "OPERATOR" : "MEMBER";
  await prisma.user.upsert({
    where: { authId: data.user.id },
    create: {
      authId: data.user.id,
      email,
      name: name.trim(),
      role,
    },
    update: { email, name: name.trim() },
  });

  return NextResponse.json({ ok: true });
}
