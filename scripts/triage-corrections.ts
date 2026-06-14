/**
 * 訂正報告のローカル一括審査（Claude Code CLI 使用・APIキー不要）。
 *
 *   node --import tsx scripts/triage-corrections.ts [--apply]
 *
 *  1. gh で open の correction イシューを取得
 *  2. 構造チェック（correction-lib・AI不使用）→ NG は REJECT-format
 *  3. 通過分は AI が「②が①の訂正を支持するか」「③の妥当性」を見て
 *     推奨対応（修正 / 補足 / 対応しない）を理由つきで提案
 *  4. triage-report.md を出力（運営者はこれだけ読む）
 *  --apply 指定時のみ、REJECT-format と「対応しない」提案のイシューに
 *     定型コメント＋クローズを行う（最終判断は運営者なので既定はドライ）。
 *
 * AI 呼び出しは claude -p（Claude Code CLIの非対話モード）を使用。
 * サブスクリプション課金で動作するため Anthropic API キーは不要。
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { parseIssueBody, structuralCheck } from "./correction-lib";

function callClaude(system: string, user: string): string {
  const prompt = `${system}\n\n---\n\n${user}`;
  return execFileSync("claude", ["-p", prompt, "--no-color"], {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 32 * 1024 * 1024,
  });
}

const SYSTEM = `あなたは「法案カルテ」訂正報告のトリアージ担当。中立・一次情報主義のサイトを守る。
与えられた報告（①カルテ本文の引用／②一次情報のURLと原文引用／③修正案）について、次を判断する:
- support: ②の原文引用が、①の記述が誤りであること（＝訂正の必要性）を実際に裏づけているか
- recommend: 運営者への推奨対応を1つ。"修正"（誤りが裏づけられ直すべき）/"補足"（誤りとまでは言えないが注記する価値）/"対応しない"（裏づけ不足・解釈の相違・カルテが既に正しい等）
- reason: 60〜120字の日本語で根拠を簡潔に
推測で補わない。②の引用が①の訂正を直接支持していなければ "対応しない" 寄りに。
出力は厳密にJSONのみ: {"support": true|false, "recommend": "修正"|"補足"|"対応しない", "reason": "..."}`;

interface Issue {
  number: number;
  title: string;
  body: string;
  url: string;
}

function ghJson(args: string[]): Issue[] {
  return JSON.parse(execFileSync("gh", args, { encoding: "utf8" })) as Issue[];
}

interface Verdict {
  support: boolean;
  recommend: "修正" | "補足" | "対応しない";
  reason: string;
}

function parseVerdict(raw: string): Verdict | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Verdict;
  } catch {
    return null;
  }
}

function main() {
  const apply = process.argv.includes("--apply");
  const issues = ghJson([
    "issue",
    "list",
    "--label",
    "correction",
    "--state",
    "open",
    "--json",
    "number,title,body,url",
    "--limit",
    "100",
  ]);

  const lines: string[] = [
    `# 訂正報告トリアージ ${new Date().toISOString()}`,
    `対象: open の correction イシュー ${issues.length} 件`,
    "",
  ];
  let nReject = 0;
  let nReview = 0;

  for (const it of issues) {
    const parsed = parseIssueBody(it.body);
    const chk = structuralCheck(parsed);

    if (!chk.ok) {
      nReject++;
      lines.push(`## #${it.number} ❌ REJECT-format`);
      lines.push(it.url);
      lines.push(...chk.problems.map((p) => `- ${p}`));
      lines.push("");
      if (apply) {
        const msg = [
          "自動チェックで次の点が確認できませんでした：",
          "",
          ...chk.problems.map((p) => `- ${p}`),
          "",
          "①カルテ本文の正確な引用／②一次情報のURLと原文引用／③具体的な修正案 をそろえて編集・再送ください。",
        ].join("\n");
        execFileSync("gh", ["issue", "comment", String(it.number), "--body", msg]);
        execFileSync("gh", [
          "issue",
          "close",
          String(it.number),
          "--reason",
          "not planned",
        ]);
      }
      continue;
    }

    nReview++;
    const raw = callClaude(
      SYSTEM,
      [
        `## 対象カルテ\n${parsed.kind}`,
        `## ① カルテ本文の引用\n${parsed.q1}`,
        `## ②-URL\n${parsed.q2url}`,
        `## ② 一次情報の原文引用\n${parsed.q2quote}`,
        `## ③ 修正案\n${parsed.q3}`,
      ].join("\n\n")
    );
    const v = parseVerdict(raw);
    lines.push(`## #${it.number} ✅ 形式OK → 推奨: ${v?.recommend ?? "（解析失敗）"}`);
    lines.push(it.url);
    lines.push(`- 対象: ${parsed.kind}`);
    if (v) {
      lines.push(`- 裏づけ(support): ${v.support ? "あり" : "なし"}`);
      lines.push(`- 理由: ${v.reason}`);
    } else {
      lines.push(`- AI応答の解析に失敗。原文: ${raw.slice(0, 200)}`);
    }
    lines.push("");

    if (apply && v?.recommend === "対応しない") {
      execFileSync("gh", [
        "issue",
        "comment",
        String(it.number),
        "--body",
        `ご報告ありがとうございます。確認しましたが、今回は対応を見送ります。\n理由: ${v.reason}\n\n（事実の誤りを示す一次情報があれば、あらためてご報告ください。）`,
      ]);
      execFileSync("gh", [
        "issue",
        "close",
        String(it.number),
        "--reason",
        "not planned",
      ]);
    }
  }

  lines.push("---");
  lines.push(
    `集計: REJECT-format ${nReject} 件 / 要確認 ${nReview} 件${apply ? "（--apply: コメント・クローズ実行済み）" : "（ドライラン）"}`
  );
  writeFileSync("triage-report.md", lines.join("\n") + "\n");
  console.log(`triage-report.md を出力（REJECT ${nReject} / 要確認 ${nReview}）`);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
