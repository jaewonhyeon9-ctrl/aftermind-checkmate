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
      moneyEnabled: true,
      todayPlanEnabled: true,
      lastSentAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    connected: !!integration,
    integration,
  });
}

// PATCH: 채널별 ON/OFF 토글 (dailyReminderEnabled | moneyEnabled | todayPlanEnabled)
export async function PATCH(req: Request) {
  const user = await requireUser();
  const body = (await req.json().catch(() => ({}))) as {
    dailyReminderEnabled?: boolean;
    moneyEnabled?: boolean;
    todayPlanEnabled?: boolean;
  };
  const data: Record<string, boolean> = {};
  if (typeof body.dailyReminderEnabled === "boolean") data.dailyReminderEnabled = body.dailyReminderEnabled;
  if (typeof body.moneyEnabled === "boolean") data.moneyEnabled = body.moneyEnabled;
  if (typeof body.todayPlanEnabled === "boolean") data.todayPlanEnabled = body.todayPlanEnabled;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const updated = await prisma.kakaoIntegration.update({
    where: { userId: user.id },
    data,
  });
  return NextResponse.json({
    ok: true,
    dailyReminderEnabled: updated.dailyReminderEnabled,
    moneyEnabled: updated.moneyEnabled,
    todayPlanEnabled: updated.todayPlanEnabled,
  });
}

// DELETE: 연동 해제
export async function DELETE() {
  const user = await requireUser();
  await prisma.kakaoIntegration.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
