/**
 * 訂正報告（GitHub Issue Form）の解析と構造チェック。
 * GitHub Action（correction-precheck.ts）とローカル審査（triage-corrections.ts）で共有する。
 *
 * FIELD のラベルは .github/ISSUE_TEMPLATE/correction.yml の attributes.label と一致させること。
 */
import { getBill } from "../content/bills";
import { isAllowedSourceUrl } from "../lib/primary-sources";

/** Issue Form のフィールドラベル（correction.yml と同期） */
export const FIELD = {
  kind: "対象カルテ",
  q1: "① 該当箇所（カルテ本文の正確な引用）",
  q2url: "② 正しい情報がある一次情報のURL",
  q2quote: "② その一次情報の該当箇所（原文の引用）",
  q3: "③ どう修正すべきか（具体的に）",
} as const;

export interface ParsedCorrection {
  kind?: string;
  q1?: string;
  q2url?: string;
  q2quote?: string;
  q3?: string;
}

/** GitHub Issue Form は本文を "### <label>\n\n<value>" の連結で表現する */
export function parseIssueBody(body: string): ParsedCorrection {
  const sections: Record<string, string> = {};
  for (const part of body.split(/^###\s+/m)) {
    const nl = part.indexOf("\n");
    if (nl === -1) continue;
    const label = part.slice(0, nl).trim();
    const value = part.slice(nl + 1).trim();
    if (label) sections[label] = value;
  }
  const clean = (v?: string): string | undefined => {
    const t = (v ?? "").trim();
    if (!t || t === "_No response_" || t === "_なし_") return undefined;
    return t;
  };
  return {
    kind: clean(sections[FIELD.kind]),
    q1: clean(sections[FIELD.q1]),
    q2url: clean(sections[FIELD.q2url]),
    q2quote: clean(sections[FIELD.q2quote]),
    q3: clean(sections[FIELD.q3]),
  };
}

/** "防災庁設置法案 (bousai)" → "bousai" */
export function billIdFromKind(kind?: string): string | undefined {
  const m = kind?.match(/\(([a-z0-9-]+)\)/);
  return m?.[1];
}

/** カルテ本文との照合用の正規化（インライン記法と空白を除去） */
function normalize(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/\{[\d,\s]+\}/g, "")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|#)[^)]*\)/g, "$1")
    .replace(/[\s　]+/g, "")
    .trim();
}

function collectText(v: unknown, out: string[]): void {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectText(x, out));
  else if (v && typeof v === "object")
    Object.values(v as Record<string, unknown>).forEach((x) =>
      collectText(x, out)
    );
}

/** ①の引用が対象カルテ本文に実在するか（緩い部分一致） */
export function quoteExistsInKarte(billId: string, quote: string): boolean {
  let bill: unknown;
  try {
    bill = getBill(billId);
  } catch {
    return false;
  }
  const out: string[] = [];
  collectText(bill, out);
  const needle = normalize(quote);
  if (needle.length < 6) return false; // 短すぎる引用は照合不能として弾く
  return normalize(out.join("\n")).includes(needle);
}

export interface CheckResult {
  ok: boolean;
  problems: string[];
  billId?: string;
}

/** ①②の構造・ドメイン・引用実在チェック（AI不使用） */
export function structuralCheck(p: ParsedCorrection): CheckResult {
  const problems: string[] = [];
  if (!p.kind) problems.push("対象カルテが未選択です。");
  if (!p.q1) problems.push("①（カルテ本文の引用）が空です。");
  if (!p.q2url) problems.push("②（一次情報のURL）が空です。");
  if (!p.q2quote) problems.push("②（一次情報の原文引用）が空です。");
  if (!p.q3) problems.push("③（修正案）が空です。");
  if (p.q2url && !isAllowedSourceUrl(p.q2url))
    problems.push(
      "②のURLが、本サイトの一次情報の対象ドメイン（go.jp / lg.jp / github.com/smartnews-smri など）ではありません。"
    );
  const billId = billIdFromKind(p.kind);
  if (billId && p.q1 && !quoteExistsInKarte(billId, p.q1))
    problems.push(
      "①の引用が対象カルテの本文に見つかりません。本文を正確に引用してください。"
    );
  return { ok: problems.length === 0, problems, billId };
}
