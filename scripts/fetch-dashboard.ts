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
import { DashboardData, BillStatusAuto } from "../content/schema";
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
  const session = String(dashboard.session.number);

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

  // --- 閣法の提出・成立件数（提出回次=今国会） ---
  const kakuho = rows.filter(
    (r) => r[col["議案種類"]] === "閣法" && r[col["提出回次"]] === session
  );
  if (kakuho.length === 0) {
    throw new Error(`第${session}回の閣法が0件。回次設定かDB側の構造を確認してください`);
  }
  const passed = kakuho.filter((r) => r[col["審議状況"]] === "成立").length;
  dashboard.cabinetBills = {
    submitted: kakuho.length,
    passed,
    asOf: jstTodayYmd(),
    sourceUrl:
      "https://github.com/smartnews-smri/house-of-representatives",
    sourceName: "スマートニュース 国会議案DB（衆議院 議案情報より）",
  };
  console.log(`閣法: ${passed} / ${kakuho.length} 件 成立`);

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

  writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2) + "\n");
  writeFileSync(statusPath, JSON.stringify(statuses, null, 2) + "\n");
  console.log("updated: dashboard.json, bills-status.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
