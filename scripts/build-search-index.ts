/**
 * サイト内検索インデックスの生成（ビルド時・prebuild/predev で実行）。
 *
 *  content/bills の全カルテを走査し、法案ヘッダ＋セクション単位の
 *  SearchRecord[] を public/search-index.json に書き出す。
 *  本文のインライン記法（出典 {n}・**強調**・[label](url)）は toPlainText で除去。
 *
 * LLM・APIキーは使わない（実行時シークレット0の原則）。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bills } from "../content/bills";
import { toPlainText } from "../lib/plain-text";
import type { SearchRecord } from "../lib/search";
import type { Bill, Section } from "../content/schema";

const SECTION_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

// 表示・検索に不要な構造キー（enum 判別子・レーン等）。スニペットにノイズを出さない
const STRUCTURAL_KEYS = new Set(["type", "lane", "tone", "badgeTone"]);

/** ブロック等のオブジェクトを再帰的に走査し、本文の string 値を集める。
 *  discriminated union の全フィールドを安全に拾え、ブロック型追加にも自動追従する。
 *  ただし type/lane/tone 等の構造キーの値（"scope" "add" "L3" 等）は除外する。 */
function collectStrings(node: unknown, out: string[]): void {
  if (typeof node === "string") {
    out.push(node);
  } else if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, out);
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (STRUCTURAL_KEYS.has(key)) continue;
      collectStrings(value, out);
    }
  }
}

/** 1セクション分の検索テキスト（見出し＋導入＋全ブロック文字列）を作る */
function sectionText(section: Section): string {
  const parts: string[] = [section.title];
  if (section.lead) parts.push(section.lead);
  for (const block of section.blocks) collectStrings(block, parts);
  return toPlainText(parts.join(" "));
}

function buildRecords(bill: Bill): SearchRecord[] {
  const records: SearchRecord[] = [];

  // 法案ヘッダ（タイトル・概要・カード）→ /bills/{id}/ 先頭
  const headerText = toPlainText(
    [
      bill.title,
      bill.subtitle,
      bill.nickname ?? "",
      bill.card.title,
      bill.card.nick,
      bill.card.desc,
    ].join(" ")
  );
  records.push({
    billId: bill.id,
    billTitle: bill.card.title,
    badge: bill.card.badge,
    session: bill.session,
    section: null,
    sectionLabel: bill.card.title,
    text: headerText,
  });

  // s1〜s8（各セクションの本文）
  for (const key of SECTION_KEYS) {
    const section = bill.sections[key];
    records.push({
      billId: bill.id,
      billTitle: bill.card.title,
      badge: bill.card.badge,
      session: bill.session,
      section: key,
      sectionLabel: section.tocLabel,
      text: sectionText(section),
    });
  }

  return records;
}

function main() {
  const records = bills.flatMap(buildRecords);
  const outDir = join(import.meta.dirname, "..", "public");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "search-index.json");
  writeFileSync(outPath, JSON.stringify(records), "utf8");
  console.log(
    `[search] ${records.length} records from ${bills.length} bills → public/search-index.json`
  );
}

main();
