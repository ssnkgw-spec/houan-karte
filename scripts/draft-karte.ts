/**
 * 執筆・検証パイプライン（SERVICE_DESIGN.md §6 L2/L3）— ローカル専用CLI
 *
 *   ANTHROPIC_API_KEY=sk-... node --import tsx scripts/draft-karte.ts <bill-id> <素材ファイル.md>
 *
 *  1. AI下書き: 素材（要綱・会議録抜粋・ISSUE BRIEF抜粋など人が集めた一次資料テキスト）から
 *     8セクションの下書きを claim-citation 束縛つきで生成
 *  2. 敵対的チェック: 別呼び出しのAIが各記述を素材と照合し、不一致をフラグ
 *  3. 出力: content/bills/<id>.draft.ts（要・人間ゲート）と review-report-<id>.md（フラグ一覧）
 *
 * APIキーはローカルの環境変数のみ。Vercel / GitHub Actions には置かない。
 * 公開判断は必ず人間ゲート（§6-3 の4項目チェック）を通すこと。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.DRAFT_MODEL ?? "claude-sonnet-4-6";

async function callClaude(system: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY が未設定です（ローカル実行専用）");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API: HTTP ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  return data.content.filter((c) => c.type === "text").map((c) => c.text).join("");
}

const DRAFT_SYSTEM = `あなたは「法案カルテ」の下書き担当。重要な国会法案を一次資料だけから中立に整理する。
厳守事項:
- 与えられた素材テキストに書かれていないことは一切書かない（推測・一般知識による補完の禁止）
- すべての事実文に、素材中の根拠箇所の逐語スニペット（30字程度）を {snippet: "..."} として併記する
- 賛否にあたる見解は必ず「どの会派・主体が述べたか」を明示。可能な限り逐語引用にする
- 推奨・誘導表現（〜すべき、望ましい等）を運営の地の文に書かない
- 立場ブロックは各立場の分量を均等にする
出力: content/bills/bousai.ts と同じ構成のTypeScriptデータ（8セクション）。各claimの直後にコメントで snippet を残す。`;

const CHECK_SYSTEM = `あなたは敵対的チェッカー。下書きの各記述について、素材テキストとの含意関係を独立に検証する。
出力はフラグのMarkdownリストのみ:
- [FLAG-帰属] 発信元の帰属が素材と一致しない/確認できない記述
- [FLAG-根拠] 素材に根拠が見つからない記述
- [FLAG-誘導] 断定・誘導・推奨と読める表現
- [FLAG-不均等] 立場ブロックの長さ・位置の不均等
各フラグに「該当箇所の引用」と「素材側の該当スニペット（無ければ『見つからず』）」を添える。問題がなければ「フラグなし」。`;

async function main() {
  const [billId, materialPath] = process.argv.slice(2);
  if (!billId || !materialPath) {
    console.error("usage: node --import tsx scripts/draft-karte.ts <bill-id> <素材ファイル.md>");
    process.exit(1);
  }
  const material = readFileSync(materialPath, "utf8");
  const example = readFileSync(
    join(import.meta.dirname, "..", "content", "bills", "bousai.ts"),
    "utf8"
  );

  console.log(`[1/2] AI下書き生成中… (model: ${MODEL})`);
  const draft = await callClaude(
    DRAFT_SYSTEM,
    `## 出力形式のお手本（この構成・記法に従う）\n\`\`\`ts\n${example}\n\`\`\`\n\n## 法案ID\n${billId}\n\n## 素材（一次資料テキスト）\n${material}`
  );

  console.log("[2/2] 敵対的チェック実行中…");
  const report = await callClaude(
    CHECK_SYSTEM,
    `## 素材（一次資料テキスト）\n${material}\n\n## 検証対象の下書き\n${draft}`
  );

  const draftPath = join("content", "bills", `${billId}.draft.ts`);
  const reportPath = `review-report-${billId}.md`;
  writeFileSync(draftPath, draft);
  writeFileSync(
    reportPath,
    `# 検証レポート: ${billId}\n\n生成: ${new Date().toISOString()}\n\n${report}\n\n---\n\n## 人間ゲート（§6-3・公開前に必ず確認）\n- [ ] フラグの立った帰属が、引用スニペットと一致しているか\n- [ ] 各立場が発信元ラベルつきで、長さ・位置が均等か\n- [ ] 「射程外」に留保が付いているか\n- [ ] 推奨・誘導表現が混入していないか\n`
  );
  console.log(`出力: ${draftPath} / ${reportPath}`);
  console.log("※ .draft.ts は git 管理外。人間ゲート通過後に <id>.ts へ確定してください。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
