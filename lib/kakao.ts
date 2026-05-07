/**
 * 카카오 OAuth + 메시지 API ("나에게 보내기") 헬퍼.
 *
 * 환경변수:
 *  - KAKAO_REST_API_KEY  : 카카오 디벨로퍼 앱 REST API 키
 *  - KAKAO_REDIRECT_URI  : 예) https://aftermind-checkmate.vercel.app/api/auth/kakao/callback
 *
 * Kakao Developer 콘솔 설정:
 *  - 동의 항목: 카카오톡 메시지 전송(talk_message), 닉네임(profile_nickname)
 *  - Redirect URI: 위와 정확히 일치
 *  - 사이트 도메인: https://aftermind-checkmate.vercel.app
 */

import { prisma } from "@/lib/prisma";

const REST_API_KEY = process.env.KAKAO_REST_API_KEY ?? "";
const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI ?? "";
const SCOPES = ["talk_message", "profile_nickname"].join(",");

export function isKakaoConfigured(): boolean {
  return !!REST_API_KEY && !!REDIRECT_URI;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: REST_API_KEY,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

interface KakaoTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  token_type: string;
  scope?: string;
}

export async function exchangeCodeForToken(code: string): Promise<KakaoTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: REST_API_KEY,
    redirect_uri: REDIRECT_URI,
    code,
  });
  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kakao token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: REST_API_KEY,
    refresh_token: refreshToken,
  });
  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kakao refresh failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function fetchKakaoUserId(accessToken: string): Promise<string> {
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kakao user fetch failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return String(json.id);
}

/** integration의 access_token이 만료됐으면 refresh, 유효한 토큰 반환 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const integration = await prisma.kakaoIntegration.findUnique({
    where: { userId },
  });
  if (!integration) throw new Error("카카오 연동이 필요합니다.");

  const safeMargin = 5 * 60 * 1000;
  if (integration.expiresAt.getTime() - safeMargin > Date.now()) {
    return integration.accessToken;
  }

  const refreshed = await refreshAccessToken(integration.refreshToken);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await prisma.kakaoIntegration.update({
    where: { userId },
    data: {
      accessToken: refreshed.access_token,
      expiresAt: newExpiresAt,
      ...(refreshed.refresh_token ? { refreshToken: refreshed.refresh_token } : {}),
    },
  });

  return refreshed.access_token;
}

/** 카카오톡 "나에게 보내기" - Default 텍스트 템플릿 */
export async function sendToSelf(
  accessToken: string,
  params: { text: string; linkUrl: string; buttonTitle?: string },
): Promise<void> {
  const templateObject = {
    object_type: "text",
    text: params.text.slice(0, 200),
    link: {
      web_url: params.linkUrl,
      mobile_web_url: params.linkUrl,
    },
    button_title: params.buttonTitle ?? "리포트 작성하기",
  };

  const body = new URLSearchParams({
    template_object: JSON.stringify(templateObject),
  });

  const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kakao send failed: ${res.status} ${text}`);
  }
}
