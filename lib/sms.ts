/**
 * 한국 카드사 알림 SMS / 알림톡 자동 파서.
 * 줄바꿈으로 구분된 여러 알림을 한 번에 처리.
 */

export type ParsedTxn = {
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  date: string; // YYYY-MM-DD
  merchant: string; // 가맹점/내역 원문
  card?: string;
  isCancel: boolean;
  raw: string;
};

const CARD_KEYWORDS = [
  "삼성카드",
  "현대카드",
  "KB국민카드",
  "국민카드",
  "신한카드",
  "롯데카드",
  "우리카드",
  "하나카드",
  "BC카드",
  "비씨카드",
  "NH카드",
  "농협카드",
  "씨티카드",
  "카카오뱅크",
  "토스뱅크",
  "카카오페이",
  "토스페이",
  "현대해상",
];

const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  {
    category: "식비",
    keywords: [
      "스타벅스", "STARBUCKS",
      "투썸", "이디야", "메가커피", "메가엠지씨", "컴포즈",
      "카페", "커피", "다방",
      "맥도날드", "MCDONALD", "버거킹", "BURGER", "롯데리아", "맘스터치", "KFC", "맥카페", "맥",
      "피자", "치킨", "굽네", "BHC", "BBQ", "교촌", "푸라닭", "처갓집",
      "도미노", "피자헛", "미스터피자",
      "분식", "김밥", "떡볶이", "라면",
      "한식", "중식", "양식", "일식", "초밥", "이자카야", "포차",
      "음식점", "식당", "레스토랑", "다이닝",
      "편의점", "GS25", "CU", "세븐일레븐", "이마트24", "MINISTOP", "CSPACE",
      "베이커리", "파리바게트", "파리바게뜨", "뚜레쥬르", "빵집",
      "이마트", "홈플러스", "롯데마트", "코스트코", "트레이더스", "노브랜드",
      "쿠팡이츠", "배민", "배달의민족", "요기요",
      "삼다수", "곰탕", "국밥", "샐러드",
    ],
  },
  {
    category: "교통",
    keywords: [
      "택시", "TAXI", "카카오T", "우티", "타다",
      "지하철", "도시철도", "교통카드", "T머니", "T-MONEY",
      "버스",
      "KTX", "코레일", "SRT", "기차",
      "주유", "주유소", "GS칼텍스", "SK엔크린", "S-OIL", "에스오일", "현대오일뱅크",
      "하이패스", "톨", "도로",
      "주차", "PARKING", "쏘카", "그린카", "이지파킹",
    ],
  },
  {
    category: "쇼핑",
    keywords: [
      "쿠팡", "COUPANG",
      "11번가", "지마켓", "GMARKET", "옥션", "AUCTION", "인터파크",
      "SSG", "이마트몰", "롯데닷컴",
      "백화점", "신세계", "현대백화점", "롯데백화점", "갤러리아",
      "아울렛", "OUTLET",
      "무신사", "29CM", "지그재그", "에이블리",
      "와디즈", "텀블벅",
      "다이소", "올리브영", "올영",
      "네이버페이", "스마트스토어",
    ],
  },
  {
    category: "여가",
    keywords: [
      "CGV", "메가박스", "롯데시네마", "영화",
      "노래방", "PC방", "스크린골프",
      "볼링", "당구", "탁구",
      "서점", "교보문고", "영풍문고", "YES24", "알라딘",
      "스팀", "STEAM", "닌텐도", "PlayStation", "PS",
      "넷플릭스", "NETFLIX", "디즈니", "왓챠", "쿠팡플레이", "유튜브 프리미엄", "스포티파이", "멜론",
    ],
  },
  {
    category: "주거",
    keywords: ["관리비", "월세", "도시가스", "전기료", "수도", "한국전력", "한전"],
  },
  {
    category: "통신",
    keywords: ["SK텔레콤", "SKT", "KT텔레콤", "LGU+", "LG U+", "LG유플러스", "알뜰폰", "통신요금", "요금제", "와이파이", "인터넷"],
  },
  {
    category: "의료",
    keywords: ["병원", "의원", "약국", "치과", "한의원", "클리닉", "메디컬", "내과", "외과", "정형외과", "안과", "이비인후과", "피부과"],
  },
  {
    category: "교육",
    keywords: ["학원", "강의", "인강", "클래스101", "인프런", "패스트캠퍼스", "유데미", "교재"],
  },
];

const INCOME_HINTS = ["입금", "급여", "이체", "환급", "환불"];

const CARD_HEADER_RE =
  /^\s*\[?(?:(?:Web발신|Web 발신|웹발신|광고)\])?\s*\[?\s*([A-Za-zㄱ-힝]{0,12}(?:카드|뱅크|페이|보험))\b/m;

/**
 * 한 텍스트 안에 여러 알림이 들어있을 수 있음.
 * 줄바꿈 2개 이상 / 카드사 헤더 패턴으로 분리.
 */
export function splitMessages(text: string): string[] {
  if (!text) return [];
  // 빈 줄 또는 카드사 헤더로 구분
  const blocks = text
    .split(/\n\s*\n/)
    .flatMap((b) => {
      // 카드사 헤더가 여러 번 등장하면 그 위치에서 분리
      const re = /(?=\[[^\]]*(?:카드|뱅크|페이)[^\]]*\])|(?=^(?:\[Web발신\]\s*)?(?:삼성카드|현대카드|KB국민카드|국민카드|신한카드|롯데카드|우리카드|하나카드|BC카드|NH카드|카카오뱅크|토스뱅크))/gm;
      return b.split(re);
    })
    .map((s) => s.trim())
    .filter(Boolean);
  return blocks;
}

/** 단일 메시지 파싱 — 실패 시 null */
export function parseCardMessage(text: string, refDate?: string): ParsedTxn | null {
  if (!text || text.length < 5) return null;
  const t = text.replace(/ /g, " ").trim();

  // 카드사
  let card: string | undefined;
  for (const k of CARD_KEYWORDS) {
    if (t.includes(k)) {
      card = k;
      break;
    }
  }

  // 금액 — "5,500원" 또는 "5500원" 또는 "₩5,500"
  const amountM =
    t.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*원/) ||
    t.match(/₩\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)/);
  if (!amountM) return null;
  const amount = Number(amountM[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // 날짜 — MM/DD or MM-DD or M월 D일
  let date = refDate ?? new Date().toISOString().slice(0, 10);
  const dm =
    t.match(/(?<![0-9])([01]?\d)[\/\-\.]([0-3]?\d)(?![0-9])/) ||
    t.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (dm) {
    const m = String(Number(dm[1])).padStart(2, "0");
    const d = String(Number(dm[2])).padStart(2, "0");
    const yr = (refDate ?? new Date().toISOString()).slice(0, 4);
    date = `${yr}-${m}-${d}`;
  }

  // 취소
  const isCancel = /(\b취소\b|\b환불\b)/.test(t);

  // 가맹점 추출 — 금액 뒤 / "일시불|할부|승인|사용" 키워드 뒤
  const afterAmount = t.split(amountM[0])[1] ?? "";
  let merchant = afterAmount
    .replace(/(일시불|\d+개월\s*할부|할부|승인|사용|취소|확인)/g, " ")
    .replace(/누적\s*[\d,]+원/g, " ")
    .replace(/잔액\s*[\d,]+원/g, " ")
    .replace(/\d{1,2}:\d{2}/g, " ")
    .replace(/\d{1,2}[\/\-\.]\d{1,2}/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-:]+|[\s\-:]+$/g, "")
    .trim();
  // 첫 줄만 사용 (다음 알림과 섞이지 않게)
  if (merchant.includes("\n")) merchant = merchant.split("\n")[0].trim();
  if (!merchant) merchant = "미분류";

  // 수입 vs 지출 추정
  let type: "INCOME" | "EXPENSE" = "EXPENSE";
  if (INCOME_HINTS.some((h) => t.includes(h)) && !/\b카드\b/.test(t.split("\n")[0])) {
    type = "INCOME";
  }

  // 카테고리
  const category = isCancel
    ? "환불"
    : type === "INCOME"
    ? "기타수입"
    : categorizeMerchant(merchant);

  return {
    amount,
    type,
    category,
    date,
    merchant,
    card,
    isCancel,
    raw: text,
  };
}

export function categorizeMerchant(merchant: string): string {
  const m = merchant.toLowerCase();
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => m.includes(k.toLowerCase()))) {
      return category;
    }
  }
  return "기타";
}

/** 멀티 메시지 파싱 */
export function parseAll(text: string, refDate?: string): ParsedTxn[] {
  return splitMessages(text)
    .map((m) => parseCardMessage(m, refDate))
    .filter((x): x is ParsedTxn => !!x);
}
