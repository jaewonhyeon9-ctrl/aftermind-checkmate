import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const bodySchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  authKey: z.string().min(1),
  userAgent: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 입력" }, { status: 400 });
  }

  const { endpoint, p256dh, authKey, userAgent } = parsed.data;

  // 동일 endpoint 있으면 업데이트, 없으면 생성
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: user.id,
      endpoint,
      p256dh,
      authKey,
      userAgent: userAgent ?? null,
    },
    update: {
      userId: user.id,
      p256dh,
      authKey,
      userAgent: userAgent ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  await requireUser();
  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint 누락" }, { status: 400 });
  }
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return NextResponse.json({ ok: true });
}
