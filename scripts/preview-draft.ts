/**
 * 下書きTSファイルをHTMLプレビューに変換するローカルCLI
 *
 *   node --import tsx scripts/preview-draft.ts <bill-id>
 *
 * 出力: preview-<bill-id>.html（git 管理外）
 * 目的: 人間ゲート（§6-3）でのレビューを可能にする
 */

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Bill, SourceRef } from "../content/schema.ts";

const billId = process.argv[2];
if (!billId) {
  console.error("usage: node --import tsx scripts/preview-draft.ts <bill-id>");
  process.exit(1);
}

const draftPath = join(process.cwd(), "content", "bills", `${billId}.draft.ts`);
const reportPath = join(process.cwd(), `review-report-${billId}.md`);

if (!existsSync(draftPath)) {
  console.error(`ファイルが見つかりません: ${draftPath}`);
  process.exit(1);
}

// ── テキスト変換 ───────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function rt(text: string, sources: SourceRef[]): string {
  return esc(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_: string, label: string, url: string) =>
        `<a href="${url}" target="_blank" rel="noopener">${label}</a>`
    )
    .replace(/\{(\d+(?:,\d+)*)\}/g, (_: string, nums: string) => {
      const links = nums.split(",").map((n) => {
        const id = Number(n.trim());
        const src = sources.find((s) => s.id === id);
        return src
          ? `<a href="${src.url}" target="_blank" rel="noopener" class="cite" title="${esc(src.title)}">[${id}]</a>`
          : `<span class="cite">[${id}]</span>`;
      });
      return `<sup>${links.join("")}</sup>`;
    });
}

// ── スニペット共通レンダー ──────────────────────────────────────
function snip(text: string | undefined): string {
  if (!text) return "";
  return `<aside class="snippet"><span class="snip-icon">▷</span> <q>${esc(text)}</q></aside>`;
}

// ── ブロックレンダー ────────────────────────────────────────────
type Block = Bill["sections"]["s1"]["blocks"][number];

function renderBlock(block: Block, sources: SourceRef[]): string {
  switch (block.type) {
    case "paragraph":
      return `<p class="para lane-${block.lane ?? "L2"}">${rt(block.text, sources)}</p>${snip(block.snippet)}`;

    case "timeline":
      return `<ol class="timeline">${block.items
        .map(
          (item) =>
            `<li class="${item.open ? "open" : ""}"><span class="year">${esc(item.year)}</span> ${rt(item.text, sources)}${snip(item.snippet)}</li>`
        )
        .join("")}</ol>`;

    case "issue":
      return `<div class="issue lane-${block.lane ?? "L3"}">
  <div class="issue-label">${esc(block.label)}</div>
  ${block.title ? `<div class="issue-title">${esc(block.title)}</div>` : ""}
  <p>${rt(block.text, sources)}</p>
  ${snip(block.snippet)}
</div>`;

    case "position":
      return `<div class="position tone-${block.tone}">
  <div class="pos-who">${esc(block.who)}</div>
  <div class="pos-stance">${esc(block.stance)}</div>
  <p>${rt(block.text, sources)}</p>
  ${snip(block.snippet)}
</div>`;

    case "oldnew":
      return `<div class="oldnew">
  <div class="on-tag">${esc(block.tag)}</div>
  <div class="on-title">${esc(block.title)}</div>
  ${block.scene ? `<div class="on-scene"><span class="scene-label">${esc(block.scene.label)}</span> ${esc(block.scene.text)}</div>` : ""}
  <div class="on-cols">
    <div class="on-col old">
      <div class="col-label">${esc(block.oldLabel ?? "今（現行）")}</div>
      <p>${rt(block.oldText, sources)}</p>
      ${snip(block.oldSnippet)}
    </div>
    <div class="on-col new">
      <div class="col-label">${esc(block.newLabel ?? "改正後")}</div>
      <p>${rt(block.newText, sources)}</p>
      ${snip(block.newSnippet)}
    </div>
  </div>
  ${
    block.impacts?.length
      ? `<div class="on-impacts">${block.impacts
          .map(
            (imp) =>
              `<div class="impact"><span class="impact-label">${esc(imp.label)}</span> ${rt(imp.text, sources)}</div>`
          )
          .join("")}</div>`
      : ""
  }
</div>`;

    case "ledger":
      return `<div class="ledger">
  <div class="ledger-col change">
    <div class="ledger-head">${esc(block.change.title)}</div>
    <ul>${block.change.items.map((i) => `<li>${rt(i, sources)}</li>`).join("")}</ul>
  </div>
  <div class="ledger-col keep">
    <div class="ledger-head">${esc(block.keep.title)}</div>
    <ul>${block.keep.items.map((i) => `<li>${rt(i, sources)}</li>`).join("")}</ul>
  </div>
</div>`;

    case "scope":
      return `<table class="scope">
  <thead><tr><th>${esc(block.voiceLabel ?? "よく挙がる声")}</th><th>バッジ</th><th>${esc(block.whereLabel ?? "どこで扱われるか")}</th></tr></thead>
  <tbody>${block.rows
    .map(
      (row) =>
        `<tr class="${row.highlight ? "highlight" : ""}">
      <td>${esc(row.topic)}</td>
      <td><span class="badge badge-${row.badgeTone}">${esc(row.badge)}</span></td>
      <td>${rt(row.where, sources)}${row.snippet ? `<aside class="snippet"><span class="snip-icon">▷</span> <q>${esc(row.snippet)}</q></aside>` : ""}</td>
    </tr>`
    )
    .join("")}</tbody>
</table>`;

    case "steps":
      return `<ol class="steps">
  ${block.lead ? `<p class="steps-lead">${esc(block.lead)}</p>` : ""}
  ${block.items
    .map(
      (step) =>
        `<li class="${step.current ? "current" : ""}">${esc(step.label)}</li>`
    )
    .join("")}
</ol>`;

    case "clock":
      return `<div class="clock">⏱ 会期クロック（ビルド時に計算・ここでは省略） ソース: [${(block.sourceIds ?? []).join(",")}]</div>`;

    case "notebox":
      return `<div class="notebox">
  <div class="notebox-title">${esc(block.title)}</div>
  ${block.paragraphs.map((p) => `<p>${rt(p, sources)}</p>`).join("")}
  ${snip(block.snippet)}
</div>`;

    case "callout":
      return `<div class="callout"><p>${rt(block.text, sources)}</p></div>`;

    case "log":
      return `<ol class="log">${block.items
        .map(
          (item) =>
            `<li class="tone-${item.tone}${item.future ? " future" : ""}">
    <span class="log-date">${esc(item.date)}</span>
    <span class="log-badge">${esc(item.badge)}</span>
    <span class="log-text">${rt(item.text, sources)}</span>
    ${item.snippet ? `<aside class="snippet log-snip"><span class="snip-icon">▷</span> <q>${esc(item.snippet)}</q></aside>` : ""}
  </li>`
        )
        .join("")}</ol>`;

    case "footnote":
      return `<p class="footnote">${rt(block.text, sources)}</p>`;

    case "glossary":
      return `<dl class="glossary">${block.items
        .map((g) => `<dt>${esc(g.term)}</dt><dd>${rt(g.desc, sources)}</dd>`)
        .join("")}</dl>`;

    default:
      return `<div class="unknown-block"><pre>${esc(JSON.stringify(block, null, 2))}</pre></div>`;
  }
}

// ── HTML テンプレート ───────────────────────────────────────────
function buildHtml(bill: Bill, reportMd: string | null): string {
  const { sources } = bill;
  const sectionKeys = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

  const tocHtml = sectionKeys
    .map((k, i) => {
      const sec = bill.sections[k];
      return `<li><a href="#${k}">§${i + 1} ${esc(sec.tocLabel)}</a></li>`;
    })
    .join("");

  const sectionsHtml = sectionKeys
    .map((k, i) => {
      const sec = bill.sections[k];
      const blocksHtml = sec.blocks.map((b) => renderBlock(b, sources)).join("\n");
      return `<section id="${k}">
  <h2>§${i + 1} ${esc(sec.title)}</h2>
  ${sec.lead ? `<p class="lead">${esc(sec.lead)}</p>` : ""}
  ${blocksHtml}
</section>`;
    })
    .join("\n");

  const sourcesHtml = sources
    .map(
      (s) =>
        `<li id="src-${s.id}">
  [${s.id}] <a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a>
  ${s.note ? `<span class="src-note">（${esc(s.note)}）</span>` : ""}
</li>`
    )
    .join("");

  const reportHtml = reportMd
    ? `<section class="report">
  <h2>検証レポート</h2>
  <pre>${esc(reportMd)}</pre>
</section>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>下書きプレビュー: ${esc(bill.title)}</title>
<style>
:root {
  --indigo: #4338ca;
  --indigo-light: #e0e7ff;
  --ochre: #b45309;
  --ochre-light: #fef3c7;
  --gray: #374151;
  --gray-light: #f3f4f6;
  --border: #e5e7eb;
  font-family: "Hiragino Sans", "Meiryo", sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: var(--gray);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { display: flex; min-height: 100vh; }

/* サイドバー TOC */
nav.toc {
  width: 220px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 24px 16px;
  border-right: 1px solid var(--border);
  background: #fff;
  font-size: 13px;
}
nav.toc h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #9ca3af; margin-bottom: 12px; }
nav.toc ul { list-style: none; }
nav.toc li { margin-bottom: 6px; }
nav.toc a { color: var(--indigo); text-decoration: none; }
nav.toc a:hover { text-decoration: underline; }

/* メインコンテンツ */
main { flex: 1; max-width: 800px; padding: 40px 48px; }

/* ヘッダー */
.bill-header { margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid var(--border); }
.bill-badge { display: inline-block; background: var(--indigo); color: #fff; font-size: 12px; padding: 2px 10px; border-radius: 9999px; margin-bottom: 10px; }
.bill-header h1 { font-size: 22px; margin-bottom: 8px; }
.bill-header .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 12px; }
.bill-header .status-row { font-size: 13px; color: #374151; }
.bill-header .status-row .asof { color: #9ca3af; margin-left: 8px; }

/* 注記バナー */
.draft-warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin-bottom: 32px; font-size: 13px; color: #92400e; }

/* セクション */
section { margin-bottom: 48px; }
section h2 { font-size: 17px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
.lead { color: #6b7280; font-size: 14px; margin-bottom: 16px; }

/* 段落 */
.para { margin-bottom: 14px; }

/* タイムライン */
.timeline { padding-left: 0; list-style: none; border-left: 3px solid var(--border); margin: 16px 0; }
.timeline li { padding: 8px 0 8px 20px; position: relative; }
.timeline li::before { content: ""; position: absolute; left: -7px; top: 16px; width: 10px; height: 10px; border-radius: 50%; background: var(--border); }
.timeline li.open::before { background: var(--indigo); }
.timeline .year { font-weight: 600; color: var(--indigo); margin-right: 8px; }

/* 課題 */
.issue { background: var(--gray-light); border-left: 4px solid var(--indigo); padding: 12px 16px; margin: 12px 0; border-radius: 0 6px 6px 0; }
.issue-label { font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
.issue-title { font-weight: 700; margin-bottom: 6px; }

/* 立場ブロック */
.position { padding: 12px 16px; margin: 12px 0; border-radius: 6px; }
.position.tone-for { background: var(--indigo-light); border-left: 4px solid var(--indigo); }
.position.tone-add { background: var(--ochre-light); border-left: 4px solid var(--ochre); }
.pos-who { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
.pos-stance { font-size: 12px; color: #6b7280; margin-bottom: 6px; }

/* 今→改正後 */
.oldnew { border: 1px solid var(--border); border-radius: 8px; margin: 16px 0; overflow: hidden; }
.on-tag { background: var(--gray-light); padding: 6px 16px; font-size: 11px; text-transform: uppercase; color: #6b7280; }
.on-title { padding: 10px 16px; font-weight: 700; font-size: 15px; border-bottom: 1px solid var(--border); }
.on-scene { padding: 8px 16px; font-size: 13px; color: #6b7280; background: #fafafa; border-bottom: 1px solid var(--border); }
.scene-label { font-weight: 600; margin-right: 4px; }
.on-cols { display: grid; grid-template-columns: 1fr 1fr; }
.on-col { padding: 12px 16px; }
.on-col.old { border-right: 1px solid var(--border); }
.col-label { font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; color: #9ca3af; }
.on-col.new .col-label { color: var(--indigo); }
.on-impacts { background: var(--gray-light); border-top: 1px solid var(--border); padding: 8px 16px; }
.impact { font-size: 13px; margin-bottom: 4px; }
.impact-label { font-weight: 600; color: var(--indigo); margin-right: 6px; }

/* 台帳（変える/変えない）*/
.ledger { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
.ledger-col { border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; }
.ledger-head { font-weight: 700; font-size: 13px; margin-bottom: 8px; }
.ledger-col.change .ledger-head { color: var(--indigo); }
.ledger-col.keep .ledger-head { color: var(--ochre); }
.ledger-col ul { padding-left: 18px; font-size: 13px; }
.ledger-col li { margin-bottom: 4px; }

/* 射程表 */
.scope { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
.scope th { background: var(--gray-light); padding: 8px 12px; text-align: left; border-bottom: 2px solid var(--border); }
.scope td { padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
.scope tr.highlight td { background: #f0f7ff; }
.badge { display: inline-block; font-size: 11px; padding: 1px 8px; border-radius: 9999px; }
.badge-in { background: var(--indigo-light); color: var(--indigo); }
.badge-out { background: #f3f4f6; color: #6b7280; }

/* ステップ */
.steps-lead { font-size: 13px; color: #6b7280; margin-bottom: 8px; }
.steps { padding-left: 0; list-style: none; display: flex; gap: 0; margin: 12px 0; }
.steps li { flex: 1; padding: 8px; font-size: 12px; background: var(--gray-light); border: 1px solid var(--border); text-align: center; }
.steps li.current { background: var(--indigo); color: #fff; font-weight: 700; }

/* 時計 */
.clock { font-size: 13px; color: #9ca3af; padding: 8px; border: 1px dashed var(--border); border-radius: 4px; margin: 8px 0; }

/* ノートボックス */
.notebox { background: var(--ochre-light); border-left: 4px solid var(--ochre); padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 12px 0; }
.notebox-title { font-weight: 700; color: var(--ochre); margin-bottom: 6px; font-size: 13px; }
.notebox p { font-size: 13px; margin-bottom: 6px; }

/* コールアウト */
.callout { background: var(--indigo-light); border-left: 4px solid var(--indigo); padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 12px 0; }

/* ログ */
.log { list-style: none; padding-left: 0; margin: 12px 0; }
.log li { display: flex; gap: 10px; align-items: baseline; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.log li.future { color: #9ca3af; }
.log-date { font-weight: 600; white-space: nowrap; min-width: 80px; }
.log-badge { font-size: 11px; padding: 1px 8px; border-radius: 9999px; white-space: nowrap; background: var(--gray-light); color: #6b7280; }
.tone-done .log-badge { background: #dcfce7; color: #166534; }
.tone-next .log-badge { background: var(--indigo-light); color: var(--indigo); }
.tone-plan .log-badge { background: var(--ochre-light); color: var(--ochre); }

/* 脚注 */
.footnote { font-size: 12px; color: #9ca3af; margin-top: 8px; }

/* 出典一覧 */
.sources-list { list-style: none; padding-left: 0; font-size: 13px; }
.sources-list li { padding: 6px 0; border-bottom: 1px solid var(--border); }
.sources-list a { color: var(--indigo); }
.src-note { color: #9ca3af; font-size: 12px; }

/* 引用リンク */
.cite { color: var(--indigo); }
sup { line-height: 1; }

/* 検証レポート */
.report { margin-top: 48px; padding-top: 32px; border-top: 2px solid #f59e0b; }
.report h2 { color: #92400e; }
.report pre { background: #fefce8; padding: 16px; border-radius: 6px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; font-family: "Courier New", monospace; margin-top: 12px; }

/* glossary */
.glossary { margin: 12px 0; }
.glossary dt { font-weight: 700; margin-top: 8px; }
.glossary dd { margin-left: 16px; font-size: 13px; }

/* 逐語スニペット（出典裏取り用） */
.snippet { display: flex; gap: 6px; align-items: baseline; margin: 4px 0 2px 0; font-size: 12px; color: #6b7280; font-style: normal; }
.snippet q { border-left: 2px solid #d1d5db; padding-left: 8px; color: #374151; font-style: italic; quotes: "「" "」"; }
.snip-icon { color: #9ca3af; flex-shrink: 0; }
.log-snip { margin-left: 0; margin-top: 2px; }
</style>
</head>
<body>
<nav class="toc">
  <h3>目次</h3>
  <ul>${tocHtml}</ul>
  <hr style="margin: 16px 0; border-color: var(--border);">
  <ul>
    <li><a href="#sources">出典一覧</a></li>
    ${reportMd ? '<li><a href="#report">検証レポート</a></li>' : ""}
  </ul>
</nav>
<main>
  <div class="draft-warning">
    ⚠️ <strong>下書き（未公開）</strong> — 人間ゲート §6-3 の確認が完了するまで公開しないこと
  </div>

  <div class="bill-header">
    <span class="bill-badge">${esc(bill.card.badge)}</span>
    <h1>${esc(bill.title)}</h1>
    <p class="subtitle">${esc(bill.subtitle)}</p>
    <p class="status-row">
      ${esc(bill.status)}
      <span class="asof">（記載 ${esc(bill.statusAsOf)}）</span>
    </p>
  </div>

  ${sectionsHtml}

  <section id="sources">
    <h2>出典一覧</h2>
    <ol class="sources-list">${sourcesHtml}</ol>
  </section>

  ${reportHtml}
</main>
</body>
</html>`;
}

// ── メイン ────────────────────────────────────────────────────
async function main() {
  const { default: bill } = (await import(
    pathToFileURL(draftPath).href
  )) as { default: Bill };

  const reportMd = existsSync(reportPath)
    ? readFileSync(reportPath, "utf8")
    : null;

  const html = buildHtml(bill, reportMd);
  const outPath = `preview-${billId}.html`;
  writeFileSync(outPath, html, "utf8");
  console.log(`出力: ${outPath}`);
  console.log(`  open ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
