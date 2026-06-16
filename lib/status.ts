/**
 * 法案ステータスの表示順・表示色を1箇所に集約する（トップ・一覧・カードで共有）。
 * 会期末に確定する "継続審査"/"審議未了"/"廃案" もここで扱う。
 */

export type StatusTone = "live" | "done";

/** 議案DBの審議状況の表示順（これ以外の状況は後ろに回す） */
export const STATUS_ORDER = [
  "成立",
  "本院議了",
  "参議院で審議中",
  "衆議院で審議中",
  "継続審査",
  "審議未了",
  "廃案",
];

/**
 * 審議状況 → トーン。
 * live = 進行中・未確定（indigo）／ done = 確定（slate）。
 * 成立も廃案も「確定」なので done。優劣ではなく「決着がついたか」の区別。
 */
export const STATUS_TONE: Record<string, StatusTone> = {
  成立: "done",
  本院議了: "live",
  参議院で審議中: "live",
  衆議院で審議中: "live",
  継続審査: "done",
  審議未了: "done",
  廃案: "done",
};

/** 決着がついた（これ以上審議が動かない）ステータス */
const SETTLED = ["成立", "継続審査", "審議未了", "廃案"];

/**
 * カードの badge 文字列 → CSSクラス（b-done=確定 / b-live=進行中）。
 * 成立・廃案・継続審査・審議未了は確定（slate）、それ以外（審議中など）は進行中（indigo）。
 */
export function badgeTone(badge: string): "b-done" | "b-live" {
  return SETTLED.includes(badge) ? "b-done" : "b-live";
}
