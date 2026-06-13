/** サイト共通定数。公開ドメイン確定後に NEXT_PUBLIC_SITE_URL（秘密ではない）で上書き可 */
export const SITE_NAME = "法案カルテ";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://houan-karte.vercel.app";
export const SITE_DESCRIPTION =
  "重要な国会法案を、報道の論調ではなく一次情報（議案情報・会議録・省庁資料）だけを材料に、固定テンプレートで中立に整理するサイト。結論は出さず、判断は読者に委ねます。";
