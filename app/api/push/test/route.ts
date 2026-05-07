import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 본인에게 테스트 푸시 발송. 구독 등록이 잘 됐는지 확인용. */
export async function POST() {
  const user = await requireUser();
  const result = await sendPushToUser(user.id, {
    title: "🔔 테스트 알림",
    body: `${user.name}님, 푸시 알림이 정상 작동해요!`,
    url: "/today",
    tag: "test-push",
  });
  return NextResponse.json({
    ok: true,
    sent: result.sent,
    removed: result.removed,
  });
}
