"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { issueCoin } from "@/lib/coin";

const BUCKET = "checkins";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

const submitSchema = z.object({
  message: z.string().min(1, "한 줄이라도 적어주세요").max(140, "140자 이내로"),
});

/** KST 정각으로 잘린 Date 반환 (현재 시각의 hour). */
function currentKstHour(): Date {
  // KST = UTC+9. 현재 epoch → KST 정각으로 절삭 → 다시 UTC Date.
  const now = Date.now();
  const ms = 60 * 60 * 1000;
  const kstNow = now + 9 * ms;
  const kstHourFloor = Math.floor(kstNow / ms) * ms;
  return new Date(kstHourFloor - 9 * ms);
}

/**
 * 체크인 작성/덮어쓰기. FormData: { photo: File, message: string }
 * 같은 KST 정각 시간대에 이미 작성한 게 있으면 덮어쓰고, 이전 사진은 삭제.
 */
export async function submitCheckin(formData: FormData) {
  const user = await requireUser();

  const file = formData.get("photo");
  const message = formData.get("message");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("사진을 선택해주세요");
  }
  if (file.size > MAX_BYTES) throw new Error("사진은 10MB 이하만 가능해요");
  if (!ALLOWED_MIME.has(file.type)) throw new Error("JPG/PNG/WEBP/HEIC 만 가능해요");

  const parsed = submitSchema.parse({ message: String(message ?? "") });
  const hour = currentKstHour();

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const stamp = hour.toISOString().replace(/[:.]/g, "-");
  const path = `${user.authId}/${stamp}-${crypto.randomUUID()}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) throw new Error("사진 업로드 실패: " + upErr.message);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const photoUrl = pub.publicUrl;

  // 같은 시간대 기존 체크인이 있으면 이전 사진 삭제 후 덮어쓰기 (보상은 1회만)
  const existing = await prisma.hourlyCheckin.findUnique({
    where: { userId_hour: { userId: user.id, hour } },
  });
  let isFirst = false;
  if (existing) {
    const oldPath = existing.photoUrl.split(`/object/public/${BUCKET}/`)[1];
    if (oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    }
    await prisma.hourlyCheckin.update({
      where: { id: existing.id },
      data: { photoUrl, message: parsed.message },
    });
  } else {
    await prisma.hourlyCheckin.create({
      data: { userId: user.id, hour, photoUrl, message: parsed.message },
    });
    isFirst = true;
  }

  // 같은 정각에 처음 올린 사진에만 50 에마 지급
  if (isFirst) {
    const hourLabel = hour.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", hour12: false });
    await issueCoin({
      toUserId: user.id,
      amount: 50,
      memo: `📸 ${hourLabel} 체크인 보상`,
    }).catch(() => {});
  }

  revalidatePath("/checkin");
  revalidatePath("/feed");
  return { rewardedEmma: isFirst ? 50 : 0 };
}

export async function deleteCheckin(id: string) {
  const user = await requireUser();
  const c = await prisma.hourlyCheckin.findUnique({ where: { id } });
  if (!c || c.userId !== user.id) throw new Error("권한 없음");

  const supabase = createAdminClient();
  const oldPath = c.photoUrl.split(`/object/public/${BUCKET}/`)[1];
  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }
  await prisma.hourlyCheckin.delete({ where: { id } });

  revalidatePath("/checkin");
  revalidatePath("/feed");
}
