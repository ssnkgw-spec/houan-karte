/**
 * 訂正報告の②で認める「一次情報」のドメイン許可リスト（単一の真実）。
 * 訂正ページの表示・GitHub Action の自動チェック・ローカル審査スクリプトの3か所で共有する。
 *
 * 方針: 政府・国会・公的機関のみ。政党サイト（立場のある発信）は事実訂正の根拠としては既定で対象外。
 */

/** 画面表示用の人にやさしい一覧 */
export const PRIMARY_SOURCE_DISPLAY = [
  "衆議院・参議院（shugiin.go.jp / sangiin.go.jp ほか）",
  "国会会議録検索システム・国立国会図書館（ndl.go.jp）",
  "e-Gov 法令検索・パブリックコメント（e-gov.go.jp）",
  "内閣法制局・各府省など政府機関（go.jp ドメイン全般）",
  "地方自治体（lg.jp ドメイン）",
  "国会議案DB（github.com/smartnews-smri）",
];

/**
 * URL が一次情報の対象ドメインかを判定する。
 * - *.go.jp（政府・国会・NDL・e-Gov・内閣法制局・各府省を包含）
 * - *.lg.jp（地方自治体）
 * - github.com/smartnews-smri 配下（スマートニュース 国会議案DB）
 */
export function isAllowedSourceUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  const host = u.hostname.toLowerCase();
  if (host === "github.com")
    return u.pathname.toLowerCase().startsWith("/smartnews-smri");
  if (host === "go.jp" || host.endsWith(".go.jp")) return true;
  if (host === "lg.jp" || host.endsWith(".lg.jp")) return true;
  return false;
}
