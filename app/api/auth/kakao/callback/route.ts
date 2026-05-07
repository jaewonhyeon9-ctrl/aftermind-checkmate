import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForToken,
  fetchKakaoUserId,
  isKakaoConfigured,
} from "@/lib/kakao";

export const dynamic = "force-dynamic";

const SIGN_SECRET =
  process.env.NEXTAUTH_SECRET ?? process.env.CRON_SECRET ?? "checkmate-kakao";

function verify(value: string, sig: string): boolean {
  const expected = createHmac("sha256", SIGN_SECRET).update(value).digest("hex");
  if (expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export async function GET(req: Request) {
  if (!isKakaoConfigured()) {
    return NextResponse.json(
      { error: "카카오 연동 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/me?kakao_error=${encodeURIComponent(errorParam)}`, req.url),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/me?kakao_error=missing_params", req.url));
  }

  // state 쿠키 검증
  const c = await cookies();
  const cookieState = c.get("kakao_oauth_state")?.value;
  c.delete("kakao_oauth_state");
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(new URL("/me?kakao_error=state_mismatch", req.url));
  }

  // state 형식: <userId>.<nonce>.<sig>
  const parts = state.split(".");
  if (parts.length !== 3) {
    return NextResponse.redirect(new URL("/me?kakao_error=bad_state", req.url));
  }
  const [userId, nonce, sig] = parts;
  if (!verify(`${userId}.${nonce}`, sig)) {
    return NextResponse.redirect(new URL("/me?kakao_error=bad_signature", req.url));
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.redirect(new URL("/me?kakao_error=user_not_found", req.url));
  }

  try {
    const token = await exchangeCodeForToken(code);
    const kakaoId = await fetchKakaoUserId(token.access_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    await prisma.kakaoIntegration.upsert({
      where: { userId },
      create: {
        userId,
        kakaoId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt,
      },
      update: {
        kakaoId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt,
      },
    });

    return NextResponse.redirect(new URL("/me?kakao=connected", req.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "kakao_unknown_error";
    return NextResponse.redirect(
      new URL(`/me?kakao_error=${encodeURIComponent(msg.slice(0, 80))}`, req.url),
    );
  }
}
