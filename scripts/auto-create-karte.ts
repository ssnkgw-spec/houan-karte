/**
 * 新規カルテ自動作成ループ（§6 L2/L3 パイプライン自動化）
 *
 *   node --import tsx scripts/auto-create-karte.ts <bill-id> <素材ファイル.md> [--init]
 *
 * --init: 初回のみ draft-karte.ts を呼んで .draft.ts を生成してからループを開始
 * --init なし: 既存の .draft.ts に対してバリデーション → 修正ループ
 *
 * バリデーションゴール（全通過まで最大 MAX_ATTEMPTS 回ループ）:
 *   1. TypeScript コンパイル（tsc --noEmit）
 *   2. lint:draft（スキーマ・出典参照・中立性）
 *   3. sources[].url が一次情報ドメイン内
 *   4. 必須セクション s1–s8 が全て存在
 *   5. s4 に position ブロック 2つ以上
 *   6. s5 に log ブロック
 *   7. s8 に scope ブロック
 *   8. HTML アンカー #s1–#s8, #sources が全て存在
 *
 * 全通過後: work/preview-{id}.html をブラウザで開く（人間が見るのはこのHTMLのみ）
 * 承認後: .draft.ts → .ts に確定 / content/bills/index.ts を更新 / git commit & push まで一括
 * 5回失敗: 残課題を出力して exit 1
 *
 * 品質基準: content/bills/kojin-joho.ts と同等の構造を目標とする。
 */

import { execFileSync, execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const MAX_ATTEMPTS = 5;

interface Issue {
  id: string;
  message: string;
}

function runCommand(cmd: string, args: string[]): { ok: boolean; output: string } {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return { ok: result.status === 0, output };
}

function validate(billId: string): Issue[] {
  const issues: Issue[] = [];

  // 1. TypeScript コンパイル
  const tscResult = runCommand("npm", ["run", "typecheck"]);
  if (!tscResult.ok) {
    // tsc エラーがあると他のチェックが意味をなさないため早期返却
    issues.push({ id: "tsc", message: `TypeScriptコンパイルエラー:\n${tscResult.output}` });
    return issues;
  }

  // 2. lint:draft（スキーマ・出典参照・中立性チェック）
  const lintResult = runCommand("node", ["--import", "tsx", "scripts/lint-draft.ts", billId]);
  if (!lintResult.ok) {
    issues.push({ id: "lint", message: `lint:draft エラー:\n${lintResult.output}` });
  }

  // 3–7. 構造チェック（別プロセスでモジュールキャッシュを回避）
  const extraResult = spawnSync(
    "node",
    ["--import", "tsx", "scripts/_check-draft-extra.ts", billId],
    { encoding: "utf8" }
  );
  try {
    const extraIssues: Issue[] = JSON.parse(extraResult.stdout ?? "[]");
    issues.push(...extraIssues);
  } catch {
    if (extraResult.stderr) {
      issues.push({ id: "extra-check", message: `構造チェックエラー: ${extraResult.stderr}` });
    }
  }

  // 8. HTML アンカーチェック（preview-draft.ts を実行してから確認）
  const previewResult = runCommand("node", [
    "--import", "tsx", "scripts/preview-draft.ts", billId,
  ]);
  if (previewResult.ok) {
    const htmlPath = join(process.cwd(), "work", `preview-${billId}.html`);
    if (existsSync(htmlPath)) {
      const html = readFileSync(htmlPath, "utf8");
      const requiredAnchors = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "sources"];
      for (const anchor of requiredAnchors) {
        if (!html.includes(`id="${anchor}"`)) {
          issues.push({ id: `anchor-${anchor}`, message: `HTMLに #${anchor} アンカーが存在しません` });
        }
      }
    }
  }

  return issues;
}

function fixWithClaude(billId: string, issues: Issue[]): void {
  const draftPath = join(process.cwd(), "content", "bills", `${billId}.draft.ts`);
  const currentDraft = readFileSync(draftPath, "utf8");

  const issueList = issues
    .map((issue, i) => `${i + 1}. [${issue.id}] ${issue.message}`)
    .join("\n");

  const prompt = `以下のTypeScript法案カルテデータファイルに問題があります。全ての問題を修正してください。

## 現在のファイル内容
\`\`\`typescript
${currentDraft}
\`\`\`

## 修正が必要な問題点
${issueList}

## 修正ルール
- 問題点を全て解消する
- content/schema.ts の Bill 型スキーマを厳守する
- 素材に書かれている事実のみを使い、推測・一般知識による補完は禁止
- 出典参照 {N} は sources 配列の id と必ず対応させる
- s4（主な論点）には立場の異なる position ブロックを均等に2つ以上含める
- s5（会期と採決）には log ブロックを含める
- s8（よくある声と射程）には scope ブロックを含める
- sources の url は go.jp / lg.jp / github.com/smartnews-smri のみ許可
- 推奨・誘導表現（〜すべき、望ましい等）を地の文に書かない

**出力形式**: TypeScript コードのみ。説明文・マークダウンのコードフェンス(\`\`\`)・前後のテキストは一切不要。`;

  const raw = execFileSync("claude", ["-p", prompt], {
    encoding: "utf8",
    timeout: 600_000,
    maxBuffer: 32 * 1024 * 1024,
  });

  // マークダウンフェンスが付いていた場合に除去
  const cleaned = raw
    .replace(/^```(?:typescript|ts)?\s*/m, "")
    .replace(/\n```\s*$/m, "")
    .trim();

  writeFileSync(draftPath, cleaned + "\n", "utf8");
  console.log("  → .draft.ts を更新しました");
}

/** kebab-case → camelCase（index.ts の import 変数名に使用） */
function toCamelCase(id: string): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** 承認確認 → .draft.ts 確定 → index.ts 更新 → git commit & push */
async function confirmAndCommit(billId: string): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question("\n承認してpushしますか？ [y/N]: ", resolve);
  });
  rl.close();

  if (!answer.toLowerCase().startsWith("y")) {
    console.log("\nスキップしました。手動で確定する場合:");
    console.log(`  mv content/bills/${billId}.draft.ts content/bills/${billId}.ts`);
    console.log("  # content/bills/index.ts に import と bills 配列エントリを追加");
    console.log("  git add content/bills/ && git commit && git push");
    return;
  }

  // 1. .draft.ts → .ts にリネーム
  const draftPath = join("content", "bills", `${billId}.draft.ts`);
  const finalPath = join("content", "bills", `${billId}.ts`);
  renameSync(draftPath, finalPath);
  console.log(`\n  ✓ ${finalPath} に確定`);

  // 法案タイトルをコミットメッセージ用に取得（正規表現で title フィールドを抽出）
  const src = readFileSync(finalPath, "utf8");
  const titleMatch = src.match(/title:\s*["']([^"']+)["']/);
  const title = titleMatch?.[1] ?? billId;

  // 2. content/bills/index.ts を更新
  const indexPath = join("content", "bills", "index.ts");
  let idx = readFileSync(indexPath, "utf8");
  const camelId = toCamelCase(billId);

  // 最後の import 行の直後に新しい import を挿入
  idx = idx.replace(
    /(import \S+ from "\.\/\S+";)\n(\n\/\*\*)/,
    `$1\nimport ${camelId} from "./${billId}";\n$2`
  );
  // bills 配列の先頭に追加（審議中の新着を上に表示）
  idx = idx.replace(
    /(export const bills: Bill\[] = \[\n)/,
    `$1  Bill.parse(${camelId}),\n`
  );
  writeFileSync(indexPath, idx, "utf8");
  console.log(`  ✓ index.ts に ${camelId} を追加`);

  // 3. git commit & push
  execSync(`git add "${finalPath}" "${indexPath}"`, { stdio: "pipe" });
  execSync(
    `git commit -m "feat: ${title}のカルテ初版を追加\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"`,
    { stdio: "inherit" }
  );
  console.log("  ✓ コミット完了");

  try {
    execSync("git push origin main", { stdio: "inherit" });
    console.log(`\n✓ push 完了！`);
  } catch {
    console.log("\n  push に失敗しました（認証エラーの可能性）。手動で実行してください:");
    console.log("  git push origin main");
  }
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const flags = rawArgs.filter((a) => a.startsWith("--"));
  const positional = rawArgs.filter((a) => !a.startsWith("--"));
  const [billId, materialPath] = positional;
  const doInit = flags.includes("--init");

  if (!billId) {
    console.error(
      "usage: node --import tsx scripts/auto-create-karte.ts <bill-id> [素材ファイル.md] [--init]"
    );
    process.exit(1);
  }

  mkdirSync("work", { recursive: true });

  // --init: draft-karte.ts で初期下書き生成
  if (doInit) {
    if (!materialPath) {
      console.error("--init には素材ファイルのパスが必要です");
      process.exit(1);
    }
    if (!existsSync(materialPath)) {
      console.error(`素材ファイルが見つかりません: ${materialPath}`);
      process.exit(1);
    }
    console.log(`\n[init] ${materialPath} から初期下書きを生成中…`);
    execSync(`node --import tsx scripts/draft-karte.ts ${billId} ${materialPath}`, {
      stdio: "inherit",
    });
    console.log("[init] 完了\n");
  }

  const draftPath = join(process.cwd(), "content", "bills", `${billId}.draft.ts`);
  if (!existsSync(draftPath)) {
    console.error(`ドラフトファイルが見つかりません: ${draftPath}`);
    console.error("--init フラグを付けて実行してください");
    process.exit(1);
  }

  // バリデーション → 修正ループ
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n━━ [${attempt}/${MAX_ATTEMPTS}] バリデーション中 ━━`);
    const issues = validate(billId);

    if (issues.length === 0) {
      console.log(`\n✓ 全バリデーション通過（${attempt}回目）`);
      const htmlPath = join(process.cwd(), "work", `preview-${billId}.html`);
      console.log(`\n最終HTMLプレビュー: ${htmlPath}`);
      try {
        execSync(`open "${htmlPath}"`);
      } catch {
        // open コマンドが使えない環境では無視
      }
      await confirmAndCommit(billId);
      process.exit(0);
    }

    console.log(`\n問題点 ${issues.length} 件:`);
    for (const issue of issues) {
      console.log(`  ✗ [${issue.id}] ${issue.message}`);
    }

    if (attempt < MAX_ATTEMPTS) {
      console.log(`\n[${attempt}/${MAX_ATTEMPTS}] Claude で修正中…`);
      fixWithClaude(billId, issues);
    }
  }

  console.error(`\n✗ ${MAX_ATTEMPTS} 回試行しても解決しませんでした`);
  console.error("素材ファイルの内容を確認し、手動で修正してください");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
