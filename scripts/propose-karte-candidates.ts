/**
 * カルテ候補の週次自動提案（GitHub Actions が daily-update で実行・LLM不使用）。
 *
 * 毎週月曜（JST）だけ動き、約7日前のコミット時点の cabinet-bills.json と現在を比較して
 * 「カルテ未作成 × 審議状況が変化した法案」を Issue「カルテ候補（週次）」に列挙する。
 * 週2本ペースの新規カルテの候補選定（コンテンツ計画）を支援する。
 *
 * env:
 *   GH_TOKEN  … CI で gh を使う場合のみ（無ければドライラン出力）
 *   FORCE_RUN … "1" で曜日チェックを無視して実行（ローカル検証用）
 * 前提: git 履歴が7日ぶん取得済みであること（daily-update.yml の fetch-depth 参照）
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CabinetBillsList } from "../content/schema";
import { upsertIssue } from "./gh-issue-lib";

const DATA_PATH = join(import.meta.dirname, "..", "content", "data", "cabinet-bills.json");
const REL_PATH = "content/data/cabinet-bills.json";
const ISSUE_TITLE = "カルテ候補（週次）";
const ISSUE_LABEL = "karte-candidate";

function jstNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

type List = ReturnType<typeof CabinetBillsList.parse>;

/** 約7日前のコミット時点のスナップショット。履歴不足・初回は undefined */
function readPrevList(): List | undefined {
  try {
    const sha = execFileSync(
      "git",
      ["rev-list", "-1", "--before=7 days ago", "HEAD", "--", REL_PATH],
      { encoding: "utf8" }
    ).trim();
    if (!sha) return undefined;
    const raw = execFileSync("git", ["show", `${sha}:${REL_PATH}`], {
      encoding: "utf8",
    });
    return CabinetBillsList.parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

function main() {
  if (process.env.FORCE_RUN !== "1" && jstNow().getUTCDay() !== 1) {
    console.log("月曜（JST）以外はスキップ");
    return;
  }

  const cur = CabinetBillsList.parse(JSON.parse(readFileSync(DATA_PATH, "utf8")));
  const prev = readPrevList();
  if (!prev) {
    console.log("7日前のスナップショットが取得できないためスキップ（初回/履歴不足）");
    return;
  }

  // 比較キーは「議案種類+件名」（閣法は kind なしなので "閣法" を補う）
  const keyOf = (b: { kind?: string; title: string }) =>
    `${b.kind ?? "閣法"}:${b.title}`;
  const prevStatus = new Map(
    [...prev.cabinet.bills, ...prev.member.bills].map((b) => [keyOf(b), b.status])
  );

  const candidates = [...cur.cabinet.bills, ...cur.member.bills].filter((b) => {
    if (b.karteId) return false; // 既にカルテがある
    const before = prevStatus.get(keyOf(b));
    return before !== undefined && before !== b.status;
  });

  if (candidates.length === 0) {
    console.log("カルテ未作成で審議状況が動いた法案はありません");
    return;
  }

  const lines = candidates.map(
    (b) =>
      `- **${b.title}**（${b.kind ?? "閣法"}${b.no}）: 「${prevStatus.get(keyOf(b))}」→「${b.status}」` +
      (b.keikaUrl ? ` ／ [経過情報](${b.keikaUrl})` : "")
  );
  const summary = `この1週間で審議状況が動いた**カルテ未作成**の法案 ${candidates.length} 件:\n\n${lines.join("\n")}`;
  console.log(summary);

  if (!process.env.GH_TOKEN) {
    console.log("（GH_TOKEN 未設定のため Issue 通知はスキップ＝ローカルドライ）");
    return;
  }

  const body = [
    summary,
    "",
    "カルテ化する場合は `/gather-sources <法案名>` → `/create-karte <bill-id>` の順で作成してください。",
    `（自動生成: ${prev.asOf} → ${cur.asOf} の比較・LLM不使用）`,
  ].join("\n");
  upsertIssue(ISSUE_TITLE, body, ISSUE_LABEL);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
