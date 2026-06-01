import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dateOnly, todayInTz } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * GET /api/money/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 인증된 사용자 본인의 Transaction을 XLSX로 다운로드.
 * from/to 생략 시 이번 달 1일 ~ 오늘.
 */
export async function GET(req: Request) {
  const user = await requireUser();
  const tz = user.timezone || "Asia/Seoul";
  const url = new URL(req.url);
  const today = todayInTz(tz);
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");

  const isDate = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const from = isDate(fromRaw) ? fromRaw! : today.slice(0, 7) + "-01";
  const to = isDate(toRaw) ? toRaw! : today;

  const txns = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: dateOnly(from), lte: dateOnly(to) },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Aftermind Checkmate";
  wb.created = new Date();

  const HEADER_FILL: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" },
  };

  const ws = wb.addWorksheet("거래 내역", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: "날짜", key: "date", width: 12 },
    { header: "구분", key: "type", width: 8 },
    { header: "카테고리", key: "category", width: 18 },
    { header: "금액(원)", key: "amount", width: 14, style: { numFmt: "#,##0" } },
    { header: "메모", key: "note", width: 40 },
  ];
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 22;

  let income = 0;
  let expense = 0;
  const byCategory: Record<string, number> = {};
  for (const t of txns) {
    if (t.type === "INCOME") income += t.amount;
    else {
      expense += t.amount;
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    }
    ws.addRow({
      date: t.date.toISOString().slice(0, 10),
      type: t.type === "INCOME" ? "수입" : "지출",
      category: t.category,
      amount: t.amount,
      note: t.note ?? "",
    });
  }

  // 요약 시트
  const summary = wb.addWorksheet("요약");
  summary.columns = [
    { header: "항목", key: "label", width: 26 },
    { header: "값", key: "value", width: 22, style: { numFmt: "#,##0" } },
  ];
  summary.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  const periodRow = summary.addRow(["기간", `${from} ~ ${to}`]);
  periodRow.getCell(2).numFmt = "@";
  summary.addRow(["수입 합계", income]);
  summary.addRow(["지출 합계", expense]);
  summary.addRow(["잔액", income - expense]);
  summary.addRow([]);
  summary.addRow(["── 카테고리별 지출 ──", ""]);
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  for (const [cat, amt] of sortedCats) {
    summary.addRow([cat, amt]);
  }

  const buf = await wb.xlsx.writeBuffer();
  const body = new Uint8Array(buf as ArrayBuffer);

  const safeName = user.name.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ]/g, "_");
  const filename = `가계부_${safeName}_${from}_${to}.xlsx`;
  const encoded = encodeURIComponent(filename);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="export.xlsx"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
