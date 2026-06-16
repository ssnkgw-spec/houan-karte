/**
 * L1（機械的事実）の自動取得スクリプト。GitHub Actions が毎日実行する。
 *
 *  - スマートニュース 国会議案DB（MIT・毎日更新）から:
 *      閣法の提出・成立件数 → content/data/dashboard.json
 *      各カルテ法案の審議状況 → content/data/bills-status.json
 *  - 会期・議席は手動定義（dashboard.json 内）を保持したまま更新する
 *
 * LLM・APIキーは一切使わない（実行時シークレット0の原則）。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DashboardData, BillStatusAuto, CabinetBillsList } from "../content/schema";
import { bills } from "../content/bills";

const GIAN_JSON_URL =
  "https://raw.githubusercontent.com/smartnews-smri/house-of-representatives/main/data/gian.json";

const DATA_DIR = join(import.meta.dirname, "..", "content", "data");

function jstTodayYmd(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

async function main() {
  const dashboardPath = join(DATA_DIR, "dashboard.json");
  const statusPath = join(DATA_DIR, "bills-status.json");
  const dashboard = DashboardData.parse(
    JSON.parse(readFileSync(dashboardPath, "utf8"))
  );
  const session = String(dashboard.session.current);

  // GIAN_JSON_PATH を指定するとローカルファイルから読む（ネットワーク制限環境でのテスト用）
  let raw: string[][];
  if (process.env.GIAN_JSON_PATH) {
    console.log(`reading 議案DB from file: ${process.env.GIAN_JSON_PATH}`);
    raw = JSON.parse(readFileSync(process.env.GIAN_JSON_PATH, "utf8"));
  } else {
    console.log(`fetching 議案DB: ${GIAN_JSON_URL}`);
    const res = await fetch(GIAN_JSON_URL);
    if (!res.ok) throw new Error(`議案DB fetch failed: HTTP ${res.status}`);
    raw = (await res.json()) as string[][];
  }
  const [header, ...rows] = raw;
  const col = Object.fromEntries(header.map((k, idx) => [k, idx]));
  const need = ["掲載回次", "提出回次", "議案種類", "議案件名", "審議状況", "経過情報URL"];
  for (const k of need) {
    if (!(k in col)) throw new Error(`議案DBのカラム構成が変わりました: ${k} がない`);
  }

  // --- 法律案（閣法・衆法・参法）の提出・成立件数（提出回次=今国会） ---
  // 予算・条約・決算・承認等は法律案ではないので対象外。
  // データは衆議院DBのため、参法（参院議員立法）は衆院に送付された分のみ＝過小の可能性。
  // ただし「成立」はどの種類も両院通過＝必ず衆院DBに載るため正確。
  const gianToId = new Map(
    bills.filter((b) => b.gianTitle).map((b) => [b.gianTitle as string, b.id])
  );
  const submittedThis = (kind: string) =>
    rows.filter(
      (r) => r[col["議案種類"]] === kind && r[col["提出回次"]] === session
    );

  const toLedgerBill = (r: string[], withKind: boolean) => {
    const title = r[col["議案件名"]];
    const keikaUrl = r[col["経過情報URL"]];
    const pubRaw = (r[col["公布年月日／法律番号"]] ?? "").split("／")[0].trim();
    const id = gianToId.get(title);
    return {
      no: Number(r[col["番号"]]),
      title,
      status: r[col["審議状況"]] || "(不明)",
      ...(withKind ? { kind: r[col["議案種類"]] } : {}),
      ...(keikaUrl?.startsWith("http") ? { keikaUrl } : {}),
      ...(pubRaw.includes("年") ? { promulgated: pubRaw } : {}),
      ...(id ? { karteId: id } : {}),
    };
  };
  const tallyCounts = (set: string[][]) => {
    const counts: Record<string, number> = {};
    for (const r of set) {
      const s = r[col["審議状況"]] || "(不明)";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  };
  const passedCount = (set: string[][]) =>
    set.filter((r) => r[col["審議状況"]] === "成立").length;

  const kakuho = submittedThis("閣法"); // 閣法
  if (kakuho.length === 0) {
    throw new Error(`第${session}回の閣法が0件。回次設定かDB側の構造を確認してください`);
  }
  const shuho = submittedThis("衆法"); // 衆院議員立法
  const sanpo = submittedThis("参法"); // 参院議員立法（衆院到達分）

  const cabinetList = kakuho
    .map((r) => toLedgerBill(r, false))
    .sort((a, b) => a.no - b.no);
  const memberList = [...shuho, ...sanpo]
    .map((r) => toLedgerBill(r, true))
    .sort((a, b) =>
      a.kind === b.kind ? a.no - b.no : a.kind === "衆法" ? -1 : 1
    );

  const kakuhoPassed = passedCount(kakuho);
  const memberPassed = passedCount(shuho) + passedCount(sanpo);
  const memberSubmitted = shuho.length + sanpo.length;
  dashboard.cabinetBills = {
    submitted: kakuho.length,
    passed: kakuhoPassed,
    member: { submitted: memberSubmitted, passed: memberPassed },
    lawTotal: {
      submitted: kakuho.length + memberSubmitted,
      passed: kakuhoPassed + memberPassed,
    },
    asOf: jstTodayYmd(),
    sourceUrl: "https://github.com/smartnews-smri/house-of-representatives",
    sourceName: "スマートニュース 国会議案DB（衆議院 議案情報より）",
  };
  console.log(
    `法律案: 閣法 ${kakuhoPassed}/${kakuho.length}・衆法 ${passedCount(shuho)}/${shuho.length}・参法 ${passedCount(sanpo)}/${sanpo.length} 成立`
  );

  const cabinetBills = CabinetBillsList.parse({
    asOf: jstTodayYmd(),
    session: dashboard.session.current,
    cabinet: { counts: tallyCounts(kakuho), bills: cabinetList },
    member: {
      counts: tallyCounts([...shuho, ...sanpo]),
      bills: memberList,
    },
  });

  // --- 各カルテ法案の審議状況（議案件名の完全一致） ---
  const s221 = rows.filter((r) => r[col["掲載回次"]] === session);
  const statuses: BillStatusAuto = {};
  for (const bill of bills) {
    if (!bill.gianTitle) continue;
    const hit = s221.find((r) => r[col["議案件名"]] === bill.gianTitle);
    if (!hit) {
      console.warn(`WARN: 議案DBに見つからない: ${bill.id} (${bill.gianTitle})`);
      continue;
    }
    const keikaUrl = hit[col["経過情報URL"]];
    statuses[bill.id] = {
      status: hit[col["審議状況"]],
      ...(keikaUrl?.startsWith("http") ? { keikaUrl } : {}),
      asOf: jstTodayYmd(),
    };
    console.log(`${bill.id}: ${hit[col["審議状況"]]}`);
  }

  dashboard.updatedAt = new Date().toISOString();

  const cabinetBillsPath = join(DATA_DIR, "cabinet-bills.json");
  writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2) + "\n");
  writeFileSync(statusPath, JSON.stringify(statuses, null, 2) + "\n");
  writeFileSync(cabinetBillsPath, JSON.stringify(cabinetBills, null, 2) + "\n");
  console.log("updated: dashboard.json, bills-status.json, cabinet-bills.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
