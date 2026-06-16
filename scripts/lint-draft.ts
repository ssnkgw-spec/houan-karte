/**
 * 単一の下書きファイルを中立リントする（lint-neutrality の単体版）
 *
 *   node --import tsx scripts/lint-draft.ts <bill-id>
 *
 * 対象: content/bills/<bill-id>.draft.ts（git 管理外）
 * 公開済みカルテの一括チェックは lint-neutrality.ts を使うこと。
 */
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { Bill } from "../content/schema";

const billId = process.argv[2];
if (!billId) {
  console.error("usage: node --import tsx scripts/lint-draft.ts <bill-id>");
  process.exit(1);
}

const draftPath = join(process.cwd(), "content", "bills", `${billId}.draft.ts`);
if (!existsSync(draftPath)) {
  console.error(`ファイルが見つかりません: ${draftPath}`);
  process.exit(1);
}

const BANNED = [
  "賛成すべき", "反対すべき", "成立させるべき", "廃案にすべき",
  "投票しよう", "投票すべき", "支持しよう", "おすすめの政党",
  "おすすめの法案", "望ましい法案",
];
const RESERVATION = ["残る", "別", "ただし", "論点", "宿題", "検討", "対象外", "枠組み"];

const refIds = (text: string): number[] =>
  [...text.matchAll(/\{([\d,\s]+)\}/g)].flatMap((m) =>
    m[1].split(",").map((s) => Number(s.trim()))
  );

async function main() {
  const { default: bill } = (await import(pathToFileURL(draftPath).href)) as {
    default: unknown;
  };

  let errors = 0;
  let warns = 0;
  const err = (msg: string) => { errors++; console.error(`  ERROR: ${msg}`); };
  const warn = (msg: string) => { warns++; console.warn(`  WARN : ${msg}`); };

  console.log(`\n— ${billId} (draft)`);

  const parsed = Bill.safeParse(bill);
  if (!parsed.success) {
    err(`スキーマ違反: ${parsed.error.message}`);
    console.log(`\n中立リント: ${errors} errors, ${warns} warnings`);
    process.exit(1);
  }
  const b = parsed.data;
  const sourceIds = new Set(b.sources.map((s) => s.id));

  type Kind = "editorial" | "fact" | "attributed";
  const texts: Array<[string, string, Kind]> = [];
  texts.push(["policyNote", b.policyNote, "editorial"]);
  texts.push(["status", b.status, "fact"]);
  b.registry.forEach((r, i) => texts.push([`registry[${i}]`, r.v, "fact"]));
  texts.push(["participation", b.participation.text, "editorial"]);
  if (b.closingNote) texts.push(["closingNote", b.closingNote, "editorial"]);

  for (const [key, sec] of Object.entries(b.sections)) {
    if (sec.lead) texts.push([`${key}.lead`, sec.lead, "editorial"]);
    sec.blocks.forEach((block, i) => {
      const at = `${key}.blocks[${i}]`;
      switch (block.type) {
        case "paragraph":   texts.push([at, block.text, "fact"]); break;
        case "timeline":
          block.items.forEach((it, j) => texts.push([`${at}[${j}]`, it.text, "fact"]));
          break;
        case "issue":       texts.push([at, block.text, "attributed"]); break;
        case "position":    texts.push([at, block.text, "attributed"]); break;
        case "oldnew":
          texts.push([`${at}.old`, block.oldText, "fact"]);
          texts.push([`${at}.new`, block.newText, "fact"]);
          block.impacts?.forEach((im, j) =>
            texts.push([`${at}.impact[${j}]`, im.text, "fact"])
          );
          if (block.scene) texts.push([`${at}.scene`, block.scene.text, "fact"]);
          break;
        case "ledger":
          [...block.change.items, ...block.keep.items].forEach((t, j) =>
            texts.push([`${at}[${j}]`, t, "fact"])
          );
          break;
        case "glossary":
          block.items.forEach((g, j) => texts.push([`${at}[${j}]`, g.desc, "fact"]));
          break;
        case "scope":
          block.rows.forEach((row, j) => {
            texts.push([`${at}.row[${j}]`, row.where, "fact"]);
            if (row.badge.includes("射程外") && !RESERVATION.some((w) => row.where.includes(w))) {
              warn(`${at}.row[${j}] 「射程外」行に留保の語が見当たらない: ${row.topic}`);
            }
          });
          break;
        case "notebox":
          block.paragraphs.forEach((p, j) => texts.push([`${at}[${j}]`, p, "fact"]));
          break;
        case "callout":     texts.push([at, block.text, "fact"]); break;
        case "log":
          block.items.forEach((it, j) => texts.push([`${at}[${j}]`, it.text, "fact"]));
          break;
        case "footnote":    texts.push([at, block.text, "editorial"]); break;
      }
    });
  }

  // 1) 出典参照の整合
  for (const [at, text] of texts) {
    for (const id of refIds(text)) {
      if (!sourceIds.has(id)) err(`${at}: 出典 {${id}} が出典一覧にない`);
    }
  }
  for (const ids of Object.values(b.sections).flatMap((s) =>
    s.blocks.filter((bl) => bl.type === "clock").map((bl) => bl.sourceIds ?? [])
  )) {
    for (const id of ids) {
      if (!sourceIds.has(id)) err(`clock: 出典 {${id}} が出典一覧にない`);
    }
  }

  // 2) 推奨・誘導表現の混入
  for (const [at, text, kind] of texts) {
    if (kind === "attributed") continue;
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

  // 4) s4 立場ブロックの等量チェック
  const posBlocks = b.sections.s4.blocks.filter((bl) => bl.type === "position");
  const posLens = posBlocks.map((bl) => (bl.type === "position" ? bl.text.length : 0));
  if (posLens.length >= 2) {
    const ratio = Math.max(...posLens) / Math.min(...posLens);
    if (ratio > 2) warn(`s4 立場ブロックの分量差が2倍超（${posLens.join("/")}字）`);
  }
  // tone 内訳の表示
  const tones = posBlocks
    .filter((bl) => bl.type === "position")
    .reduce<Record<string, number>>(
      (acc, bl) => {
        if (bl.type === "position") acc[bl.tone] = (acc[bl.tone] ?? 0) + 1;
        return acc;
      },
      {}
    );
  console.log(`  tone: ${JSON.stringify(tones)}`);

  // 5) 記載時点の鮮度
  const ageDays = (Date.now() - new Date(b.statusAsOf).getTime()) / 86400000;
  if (ageDays > 45) warn(`記載時点が${Math.floor(ageDays)}日前（要更新確認）`);

  console.log(`\n中立リント: ${errors} errors, ${warns} warnings`);
  if (errors > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
