/**
 * 訂正報告イシューの自動チェック（GitHub Actions から実行・AI不使用・シークレット不要）。
 * ①②の構造・②URLのドメイン・①引用のカルテ本文への実在を機械的に検証し、
 * NG ならラベル `format-invalid` ＋不足点を自動コメント、OK なら `needs-review` を付与する。
 *
 * env: ISSUE_NUMBER, ISSUE_BODY, GH_TOKEN（gh CLI 認証用）
 */
import { execFileSync } from "node:child_process";
import { parseIssueBody, structuralCheck } from "./correction-lib";

const number = process.env.ISSUE_NUMBER;
const body = process.env.ISSUE_BODY ?? "";
if (!number) {
  console.error("ISSUE_NUMBER が未設定です");
  process.exit(1);
}

const gh = (args: string[]) =>
  execFileSync("gh", args, { stdio: ["ignore", "inherit", "inherit"] });
const tryGh = (args: string[]) => {
  try {
    gh(args);
  } catch {
    /* ラベル未存在などは無視 */
  }
};

const res = structuralCheck(parseIssueBody(body));

if (res.ok) {
  tryGh(["issue", "edit", number, "--remove-label", "format-invalid"]);
  gh(["issue", "edit", number, "--add-label", "needs-review"]);
  console.log(`#${number}: OK → needs-review`);
} else {
  tryGh(["issue", "edit", number, "--remove-label", "needs-review"]);
  gh(["issue", "edit", number, "--add-label", "format-invalid"]);
  const msg = [
    "ご報告ありがとうございます。ただ、この窓口は **一次情報に基づく訂正の窓口** のため、自動チェックで次の点が確認できませんでした：",
    "",
    ...res.problems.map((p) => `- ${p}`),
    "",
    "お手数ですが、**①カルテ本文の正確な引用／②本サイトが一次情報とするサイト（go.jp など）のURLと原文引用／③具体的な修正案** をそろえて編集・再送いただけると確認できます。個人攻撃・出典のない主張・報道のみを根拠とする報告は対象外です。",
  ].join("\n");
  execFileSync("gh", ["issue", "comment", number, "--body", msg], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  console.log(`#${number}: format-invalid → ${res.problems.join(" / ")}`);
}
