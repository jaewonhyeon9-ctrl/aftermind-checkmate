import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, createHmac } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { buildAuthorizeUrl, isKakaoConfigured } from "@/lib/kakao";

export const dynamic = "force-dynamic";

const SIGN_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.CRON_SECRET ?? "checkmate-kakao";

function sign(value: string): string {
  return createHmac("sha256", SIGN_SECRET).update(value).digest("hex");
}

export async function GET() {
  if (!isKakaoConfigured()) {
    return NextResponse.json(
      { error: "카카오 연동 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const user = await requireUser();
  const nonce = randomBytes(16).toString("hex");
  const stateValue = `${user.id}.${nonce}`;
  const stateSig = sign(stateValue);
  const state = `${stateValue}.${stateSig}`;

  // CSRF 방어용 쿠키 (callback에서 검증)
  const c = await cookies();
  c.set("kakao_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10분
  });

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
