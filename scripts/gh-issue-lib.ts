/**
 * GitHub Issue の作成/追記の共有ヘルパー（gh CLI 経由・LLM不使用）。
 * detect-status-changes.ts / propose-karte-candidates.ts が使う。
 *
 * タイトル完全一致の open Issue があればコメント追記、無ければ新規作成する
 * （ラベルが未作成でも動くよう、ラベル付与の失敗は無視する）。
 */
import { execFileSync } from "node:child_process";

const ghOut = (args: string[]): string =>
  execFileSync("gh", args, { encoding: "utf8" });
const gh = (args: string[]) => {
  execFileSync("gh", args, { stdio: ["ignore", "inherit", "inherit"] });
};
const tryGh = (args: string[]) => {
  try {
    gh(args);
  } catch {
    /* ラベル未存在などは無視 */
  }
};

export function upsertIssue(title: string, body: string, label?: string): void {
  let existing: number | undefined;
  try {
    const found = JSON.parse(
      ghOut([
        "issue",
        "list",
        "--state",
        "open",
        "--search",
        `${title} in:title`,
        "--json",
        "number,title",
        "--limit",
        "10",
      ])
    ) as Array<{ number: number; title: string }>;
    existing = found.find((i) => i.title === title)?.number;
  } catch {
    existing = undefined;
  }

  if (existing) {
    gh(["issue", "comment", String(existing), "--body", body]);
    console.log(`既存 Issue #${existing} にコメントしました`);
  } else {
    const url = ghOut(["issue", "create", "--title", title, "--body", body]).trim();
    if (label) tryGh(["issue", "edit", url, "--add-label", label]);
    console.log(`Issue を作成しました: ${url}`);
  }
}
