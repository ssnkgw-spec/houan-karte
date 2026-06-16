/**
 * 中立リント（SERVICE_DESIGN.md §6-2-4）。ビルド前・CIで自動実行する機械検査。
 *
 *  ERROR（ビルド失敗）:
 *   - スキーマ違反（zod）
 *   - 本文中の出典参照 {n} が出典一覧に存在しない（claim-citation 束縛の破れ）
 *   - 推奨・誘導表現が運営の地の文に混入
 *  WARN（出力のみ）:
 *   - L2/L3 の事実ブロックに出典参照が1つもない
 *   - ④の立場ブロックの分量が互いに2倍超（等量の原則）
 *   - 「射程外」行に留保の語が見当たらない
 *   - 記載時点（statusAsOf）が45日より古い
 */
import { Bill } from "../content/schema";
import { bills } from "../content/bills";

let errors = 0;
let warns = 0;
const err = (msg: string) => {
  errors++;
  console.error(`  ERROR: ${msg}`);
};
const warn = (msg: string) => {
  warns++;
  console.warn(`  WARN : ${msg}`);
};

// 運営の地の文（lead・paragraph・footnote）に混入してはいけない推奨・誘導表現
const BANNED = [
  "賛成すべき",
  "反対すべき",
  "成立させるべき",
  "廃案にすべき",
  "投票しよう",
  "投票すべき",
  "支持しよう",
  "おすすめの政党",
  "おすすめの法案",
  "望ましい法案",
];
// 射程外の行に求める留保の語（「射程外＝安全」と読ませない原則）
const RESERVATION = ["残る", "別", "ただし", "論点", "宿題", "検討", "対象外", "枠組み"];

const refIds = (text: string): number[] =>
  [...text.matchAll(/\{([\d,\s]+)\}/g)].flatMap((m) =>
    m[1].split(",").map((s) => Number(s.trim()))
  );

for (const bill of bills) {
  console.log(`\n— ${bill.id}`);
  const parsed = Bill.safeParse(bill);
  if (!parsed.success) {
    err(`スキーマ違反: ${parsed.error.message}`);
    continue;
  }
  const sourceIds = new Set(bill.sources.map((s) => s.id));

  // 全テキストを (場所, テキスト, 種別) で列挙
  type Kind = "editorial" | "fact" | "attributed";
  const texts: Array<[string, string, Kind]> = [];
  texts.push(["policyNote", bill.policyNote, "editorial"]);
  texts.push(["status", bill.status, "fact"]);
  bill.registry.forEach((r, i) => texts.push([`registry[${i}]`, r.v, "fact"]));
  texts.push(["participation", bill.participation.text, "editorial"]);
  if (bill.closingNote) texts.push(["closingNote", bill.closingNote, "editorial"]);
  if (bill.enforcement?.note)
    texts.push(["enforcement.note", bill.enforcement.note, "fact"]);
  bill.votes?.forEach((v, i) => {
    if (v.note) texts.push([`votes[${i}].note`, v.note, "fact"]);
  });

  for (const [key, sec] of Object.entries(bill.sections)) {
    if (sec.lead) texts.push([`${key}.lead`, sec.lead, "editorial"]);
    sec.blocks.forEach((b, i) => {
      const at = `${key}.blocks[${i}]`;
      switch (b.type) {
        case "paragraph":
          texts.push([at, b.text, "fact"]);
          break;
        case "timeline":
          b.items.forEach((it, j) => texts.push([`${at}[${j}]`, it.text, "fact"]));
          break;
        case "issue":
          texts.push([at, b.text, "attributed"]);
          break;
        case "position":
          texts.push([at, b.text, "attributed"]);
          break;
        case "oldnew":
          texts.push([`${at}.old`, b.oldText, "fact"]);
          texts.push([`${at}.new`, b.newText, "fact"]);
          b.impacts?.forEach((im, j) => texts.push([`${at}.impact[${j}]`, im.text, "fact"]));
          if (b.scene) texts.push([`${at}.scene`, b.scene.text, "fact"]);
          break;
        case "ledger":
          [...b.change.items, ...b.keep.items].forEach((t, j) =>
            texts.push([`${at}[${j}]`, t, "fact"])
          );
          break;
        case "glossary":
          b.items.forEach((g, j) => texts.push([`${at}[${j}]`, g.desc, "fact"]));
          break;
        case "scope":
          b.rows.forEach((row, j) => {
            texts.push([`${at}.row[${j}]`, row.where, "fact"]);
            if (
              row.badge.includes("射程外") &&
              !RESERVATION.some((w) => row.where.includes(w))
            ) {
              warn(`${at}.row[${j}] 「射程外」行に留保の語が見当たらない: ${row.topic}`);
            }
          });
          break;
        case "notebox":
          b.paragraphs.forEach((p, j) => texts.push([`${at}[${j}]`, p, "fact"]));
          break;
        case "callout":
          texts.push([at, b.text, "fact"]);
          break;
        case "log":
          b.items.forEach((it, j) => texts.push([`${at}[${j}]`, it.text, "fact"]));
          break;
        case "footnote":
          texts.push([at, b.text, "editorial"]);
          break;
      }
    });
  }

  // 1) 出典参照の整合（ERROR）
  for (const [at, text] of texts) {
    for (const id of refIds(text)) {
      if (!sourceIds.has(id)) err(`${at}: 出典 {${id}} が出典一覧にない`);
    }
  }
  for (const ids of [
    ...Object.values(bill.sections).flatMap((s) =>
      s.blocks.filter((b) => b.type === "clock").map((b) => b.sourceIds ?? [])
    ),
  ]) {
    for (const id of ids) {
      if (!sourceIds.has(id)) err(`clock: 出典 {${id}} が出典一覧にない`);
    }
  }
  // votes / enforcement の sourceIds 束縛（ERROR）
  const structuredRefs: Array<[string, number[]]> = [];
  if (bill.enforcement)
    structuredRefs.push(["enforcement", bill.enforcement.sourceIds]);
  bill.votes?.forEach((v, i) =>
    structuredRefs.push([`votes[${i}]`, v.sourceIds])
  );
  for (const [at, ids] of structuredRefs) {
    for (const id of ids) {
      if (!sourceIds.has(id)) err(`${at}: 出典 {${id}} が出典一覧にない`);
    }
  }

  // 2) 運営の地の文への推奨・誘導表現の混入（ERROR）
  for (const [at, text, kind] of texts) {
    if (kind === "attributed") continue; // 発信元ラベル付きの主張は対象外
    for (const w of BANNED) {
      if (text.includes(w)) err(`${at}: 推奨・誘導表現「${w}」が地の文にある`);
    }
  }

  // 3) 事実ブロックの出典束縛（WARN）
  for (const [at, text, kind] of texts) {
    if (kind === "editorial") continue;
    if (text.length > 80 && refIds(text).length === 0) {
      warn(`${at}: 長い事実記述に出典参照がない`);
    }
  }

  // 4) ④の立場ブロックの等量チェック（WARN）
  const posLens = bill.sections.s4.blocks
    .filter((b) => b.type === "position")
    .map((b) => (b.type === "position" ? b.text.length : 0));
  if (posLens.length >= 2) {
    const ratio = Math.max(...posLens) / Math.min(...posLens);
    if (ratio > 2) warn(`s4 立場ブロックの分量差が2倍超（${posLens.join("/")}字）`);
  }

  // 5) 記載時点の鮮度（WARN）
  const ageDays =
    (Date.now() - new Date(bill.statusAsOf).getTime()) / 86400000;
  if (ageDays > 45) warn(`記載時点が${Math.floor(ageDays)}日前（要更新確認）`);
}

console.log(`\n中立リント: ${errors} errors, ${warns} warnings`);
if (errors > 0) process.exit(1);
