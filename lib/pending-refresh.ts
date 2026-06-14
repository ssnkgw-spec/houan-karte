/**
 * 「議案DBの審議状況は進んだが、カルテ本文がまだ追従していない」隙間の判定（ビルド時）。
 * content/data/pending-refresh.json（scripts/detect-status-changes.ts が維持）を唯一のソースに、
 * 読者向けバナー／一覧チップの表示可否を1か所で決める。
 *
 * マーカー自体は反映済み entry を prune して持つが、ページ側でも statusAsOf < changedAt を
 * 再評価する（人間が本文を直して push した直後＝マーカー prune 前でも即座にバナーが消える二重防御）。
 */
import pendingRaw from "@/content/data/pending-refresh.json";
import { PendingRefresh } from "@/content/schema";

const pending = PendingRefresh.parse(pendingRaw);

export interface StaleNotice {
  dbStatus: string;
  changedAt: string;
  keikaUrl?: string;
}

/** 本文未反映なら通知情報を返す。反映済み・該当なしは null */
export function getStaleNotice(
  billId: string,
  statusAsOf: string
): StaleNotice | null {
  const e = pending[billId];
  if (!e) return null;
  if (statusAsOf >= e.changedAt) return null;
  return { dbStatus: e.dbStatus, changedAt: e.changedAt, keikaUrl: e.keikaUrl };
}
