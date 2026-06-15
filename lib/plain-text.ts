/**
 * カルテ本文のインライン記法を、プレーンテキストに落とす。
 * JSON-LD（構造化データ）の値は素のテキストである必要があるため、
 *   **強調**      → 強調
 *   {1} {1,2}     → 除去（出典番号）
 *   [表示名](URL) → 表示名
 * RichText.tsx の TOKEN と同じ記法を対象にする。
 */
const TOKEN =
  /(\*\*.+?\*\*)|(\{[\d,\s]+\})|(\[[^\]]+\]\((?:https?:\/\/|#)[^)]*\))/g;

export function toPlainText(text: string): string {
  return text
    .replace(TOKEN, (tok) => {
      if (tok.startsWith("**")) return tok.slice(2, -2);
      if (tok.startsWith("{")) return "";
      const lm = tok.match(/^\[([^\]]+)\]\([^)]*\)$/);
      return lm ? lm[1] : tok;
    })
    // 出典除去で生じた二重スペースや前後の空白を整える
    .replace(/\s{2,}/g, " ")
    .trim();
}
