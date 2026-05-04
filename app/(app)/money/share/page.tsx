import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { SmsImportPanel } from "../SmsImportPanel";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  text?: string;
  title?: string;
  url?: string;
}>;

/**
 * Web Share Target 진입점.
 * 카드 알림 메시지를 외부 앱에서 공유 → 이 페이지로 들어와 자동 파싱.
 */
export default async function MoneyShareTargetPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();
  const sp = await searchParams;

  // text가 메인. title도 합쳐주면 카드사 헤더가 들어올 수 있음
  const initialText = [sp.title, sp.text, sp.url]
    .filter(Boolean)
    .join("\n");

  return (
    <>
      <PageHeader title="공유 받음" subtitle="카드 알림을 자동 분석합니다" />
      <div className="px-5 py-5 space-y-5">
        <SmsImportPanel initialText={initialText} />
      </div>
    </>
  );
}
