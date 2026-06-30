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
 * 5回失敗: 残課題を出力して exit 1
 *
 * 品質基準: content/bills/kojin-joho.ts と同等の構造を目標とする。
 */

import { execFileSync, execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

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
