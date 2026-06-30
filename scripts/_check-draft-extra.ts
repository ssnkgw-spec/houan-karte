/**
 * auto-create-karte.ts から子プロセスとして呼ばれる構造チェックヘルパー。
 * モジュールキャッシュを避けるため別プロセスで実行する。
 *
 * 標準出力: JSON 形式の Issue 配列
 * 終了コード: 常に 0（エラーは JSON に含む）
 *
 *   node --import tsx scripts/_check-draft-extra.ts <bill-id>
 */
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { Bill } from "../content/schema";
import { isAllowedSourceUrl } from "../lib/primary-sources";

interface Issue {
  id: string;
  message: string;
}

const billId = process.argv[2];
if (!billId) {
  process.stdout.write(JSON.stringify([{ id: "args", message: "bill-id が指定されていません" }]));
  process.exit(0);
}

const draftPath = join(process.cwd(), "content", "bills", `${billId}.draft.ts`);

async function main() {
  const issues: Issue[] = [];

  let bill: Bill;
  try {
    const mod = await import(pathToFileURL(draftPath).href);
    bill = mod.default as Bill;
  } catch (e) {
    issues.push({ id: "import", message: `ドラフト読み込みエラー: ${(e as Error).message}` });
    process.stdout.write(JSON.stringify(issues));
    return;
  }

  // source URL ドメインチェック
  for (const src of bill.sources) {
    if (!isAllowedSourceUrl(src.url)) {
      issues.push({
        id: `url-${src.id}`,
        message: `sources[${src.id}] のURLが一次情報ドメイン外です: ${src.url}`,
      });
    }
  }

  // 必須セクション存在チェック
  for (const s of ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const) {
    if (!bill.sections[s]) {
      issues.push({ id: `sec-${s}`, message: `セクション ${s} が存在しません` });
    }
  }

  // s4: position ブロック 2つ以上（複数立場）
  const posBlocks = bill.sections.s4?.blocks.filter((b) => b.type === "position") ?? [];
  if (posBlocks.length < 2) {
    issues.push({
      id: "s4-positions",
      message: `s4（主な論点）に position ブロックが ${posBlocks.length} 個（最低2つ必要）`,
    });
  }

  // s5: log ブロックが必須
  const logBlocks = bill.sections.s5?.blocks.filter((b) => b.type === "log") ?? [];
  if (logBlocks.length === 0) {
    issues.push({ id: "s5-log", message: "s5（会期と採決）に log ブロックがありません" });
  }

  // s8: scope ブロックが必須
  const scopeBlocks = bill.sections.s8?.blocks.filter((b) => b.type === "scope") ?? [];
  if (scopeBlocks.length === 0) {
    issues.push({ id: "s8-scope", message: "s8（よくある声と射程）に scope ブロックがありません" });
  }

  process.stdout.write(JSON.stringify(issues));
}

main().catch((e) => {
  process.stdout.write(JSON.stringify([{ id: "unexpected", message: String(e) }]));
});
