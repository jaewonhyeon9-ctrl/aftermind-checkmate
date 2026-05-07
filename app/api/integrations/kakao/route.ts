import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: 연동 상태 조회
export async function GET() {
  const user = await requireUser();
  const integration = await prisma.kakaoIntegration.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      kakaoId: true,
      dailyReminderEnabled: true,
      lastSentAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    connected: !!integration,
    integration,
  });
}

// PATCH: 데일리 리마인더 ON/OFF 토글
export async function PATCH(req: Request) {
  const user = await requireUser();
  const body = (await req.json().catch(() => ({}))) as {
    dailyReminderEnabled?: boolean;
  };
  if (typeof body.dailyReminderEnabled !== "boolean") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const updated = await prisma.kakaoIntegration.update({
    where: { userId: user.id },
    data: { dailyReminderEnabled: body.dailyReminderEnabled },
  });
  return NextResponse.json({ ok: true, dailyReminderEnabled: updated.dailyReminderEnabled });
}

// DELETE: 연동 해제
export async function DELETE() {
  const user = await requireUser();
  await prisma.kakaoIntegration.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
