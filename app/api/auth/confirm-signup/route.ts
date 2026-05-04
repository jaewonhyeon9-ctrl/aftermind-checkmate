import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 입력" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.getUserById(parsed.data.userId);
  if (error || !data.user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없어요" }, { status: 404 });
  }

  if (data.user.email !== parsed.data.email) {
    return NextResponse.json({ error: "이메일이 일치하지 않아요" }, { status: 403 });
  }

  if (data.user.email_confirmed_at) {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(parsed.data.userId, {
    email_confirm: true,
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
