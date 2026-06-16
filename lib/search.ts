/**
 * サイト内検索のクライアント側ロジック（外部ライブラリなし）。
 * インデックスは scripts/build-search-index.ts がビルド時に生成する
 * public/search-index.json（SearchRecord[]）。
 *
 * 純静的サイトのため検索エンジンは持たず、小規模コーパス（法案数本）を
 * substring マッチで素朴に走査する。日本語はトークナイザより部分一致が確実。
 */

/** 検索インデックスの1レコード（法案ヘッダ or セクション単位） */
export type SearchRecord = {
  billId: string; // 例 "kojin-joho"
  billTitle: string; // card.title
  badge: string; // card.badge（"参院で審議中" 等）
  session: number; // 国会回次（例 221）。会期横断ランキングの二次キー
  section: string | null; // "s4" 等。null = 法案ヘッダ（→ /bills/{id}/ 先頭）
  sectionLabel: string; // セクション見出し（tocLabel）。ヘッダは法案名
  text: string; // toPlainText 済みのプレーン本文
};

/** スニペットを3分割で返す（match を <mark> 表示するため） */
export type Snippet = { before: string; match: string; after: string };

export type SearchHit = {
  record: SearchRecord;
  score: number;
  snippet: Snippet;
  /** 同一法案内でヒットした他セクションの件数（0 の場合は非表示） */
  otherSections: number;
};

/** 全角・半角や大文字小文字の揺れを吸収する */
function normalize(s: string): string {
  return s.normalize("NFKC").toLowerCase();
}

const SNIPPET_RADIUS = 40; // 一致位置の前後に出す文字数
const MAX_HITS = 20;

/** 一致位置の前後を切り出して3分割スニペットを作る */
function buildSnippet(text: string, matchStart: number, matchLen: number): Snippet {
  const from = Math.max(0, matchStart - SNIPPET_RADIUS);
  const to = Math.min(text.length, matchStart + matchLen + SNIPPET_RADIUS);
  const before = (from > 0 ? "…" : "") + text.slice(from, matchStart);
  const match = text.slice(matchStart, matchStart + matchLen);
  const after = text.slice(matchStart + matchLen, to) + (to < text.length ? "…" : "");
  return { before, match, after };
}

/**
 * records をクエリで検索し、関連度（降順）→会期（降順）でソートして返す。
 * クエリは空白区切りの AND（全語を含むレコードのみヒット）。
 */
export function searchRecords(query: string, records: SearchRecord[]): SearchHit[] {
  // norm: 幅・大小を無視したマッチ判定用（NFKC は長さ非保存）
  // raw: 元テキストのスニペット位置算出用（toLowerCase は長さ保存）
  const terms = query
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => ({ norm: normalize(t), raw: t.toLowerCase() }));
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];

  for (const record of records) {
    const normHay = normalize(record.text); // 判定・スコア用
    const origLower = record.text.toLowerCase(); // 位置算出用（record.text と長さ一致）
    const titleHay = normalize(record.billTitle + " " + record.sectionLabel);

    let score = 0;
    let firstHitStart = -1;
    let firstHitLen = 0;
    let snippetSrc = record.text; // スニペットを切り出すテキスト（通常は元テキスト）
    let allTermsFound = true;

    for (const { norm, raw } of terms) {
      const inTitle = titleHay.includes(norm);
      const matched = normHay.includes(norm);
      if (!inTitle && !matched) {
        allTermsFound = false;
        break;
      }
      // タイトル/見出し一致は強く加点、本文一致は出現回数で加点
      if (inTitle) score += 50;
      if (matched) {
        const occurrences = normHay.split(norm).length - 1;
        score += 10 + occurrences * 2;
        // まず元テキストで位置を取る（toLowerCase は長さ保存）
        const pos = origLower.indexOf(raw);
        if (pos >= 0 && (firstHitStart < 0 || pos < firstHitStart)) {
          firstHitStart = pos;
          firstHitLen = raw.length;
          snippetSrc = record.text;
        } else if (firstHitStart < 0) {
          // NFKC 正規化でのみ一致（全角→半角等）：正規化テキストで位置を取る
          const normPos = normHay.indexOf(norm);
          if (normPos >= 0) {
            firstHitStart = normPos;
            firstHitLen = norm.length;
            snippetSrc = normHay;
          }
        }
      }
    }

    if (!allTermsFound) continue;

    // 法案ヘッダ（section=null）は概要なので僅かに優先
    if (record.section === null) score += 5;

    const snippet =
      firstHitStart >= 0
        ? buildSnippet(snippetSrc, firstHitStart, firstHitLen)
        : { before: "", match: "", after: record.text.slice(0, SNIPPET_RADIUS * 2) };

    hits.push({ record, score, snippet, otherSections: 0 });
  }

  // 法案単位でグルーピング：同一法案内で最スコアのセクションを代表に、残りを otherSections でカウント
  const byBill = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const id = hit.record.billId;
    if (!byBill.has(id)) byBill.set(id, []);
    byBill.get(id)!.push(hit);
  }

  const grouped: SearchHit[] = [];
  for (const billHits of byBill.values()) {
    billHits.sort((a, b) => b.score - a.score);
    const best = billHits[0];
    grouped.push({ ...best, otherSections: billHits.length - 1 });
  }

  grouped.sort((a, b) => b.score - a.score || b.record.session - a.record.session);
  return grouped.slice(0, MAX_HITS);
}
