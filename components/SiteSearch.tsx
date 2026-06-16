"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchRecords, type SearchHit, type SearchRecord } from "@/lib/search";

/**
 * サイト内検索（ヘッダ常設トリガー＋モーダル）。
 * インデックス（public/search-index.json）はモーダル初回オープン時のみ取得する。
 * ⌘K / Ctrl+K で開閉、Esc で閉じる。会期横断・セクション単位ジャンプ対応。
 */
export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<SearchRecord[] | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0); // キーボード選択中の結果index

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // インデックスを遅延取得（取得済みなら何もしない）
  const ensureIndex = useCallback(async () => {
    if (records) return;
    try {
      const res = await fetch("/search-index.json");
      if (!res.ok) return;
      setRecords((await res.json()) as SearchRecord[]);
    } catch {
      // 取得失敗時は無検索のまま（静的サイトのため通常は発生しない）
    }
  }, [records]);

  const openModal = useCallback(() => {
    setOpen(true);
    void ensureIndex();
  }, [ensureIndex]);

  const closeModal = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // グローバルショートカット ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) void ensureIndex();
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ensureIndex]);

  // 開いたら入力にフォーカス
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

// クエリ変化で検索
  useEffect(() => {
    if (!records || !query.trim()) {
      setHits([]);
      setActive(0);
      return;
    }
    setHits(searchRecords(query, records));
    setActive(0);
  }, [query, records]);

  const go = useCallback(
    (hit: SearchHit) => {
      const { billId, section } = hit.record;
      closeModal();
      setQuery("");
      if (section) {
        const targetPath = `/bills/${billId}/`;
        if (window.location.pathname === targetPath) {
          // 同じカルテページ内：スムーズスクロール
          document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
        } else {
          // 別ページへ：ブラウザネイティブ遷移でハッシュスクロールを確実に行う
          window.location.href = `${targetPath}#${section}`;
        }
      } else {
        router.push(`/bills/${billId}/`);
      }
    },
    [router, closeModal]
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && hits[active] && !e.nativeEvent.isComposing) {
      e.preventDefault();
      go(hits[active]);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="sitesearch-trigger"
        onClick={openModal}
        aria-label="サイト内検索を開く"
      >
        <span aria-hidden="true">⌕</span>
        <span className="label">検索</span>
        <kbd aria-hidden="true">⌘K</kbd>
      </button>

      {open && (
        <div
          className="search-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="search-modal"
            role="dialog"
            aria-modal="true"
            aria-label="サイト内検索"
          >
            <div className="search-inputrow">
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                ref={inputRef}
                type="search"
                className="search-input"
                placeholder="法案名・キーワードで探す（例: 課徴金, 献金, スパイ）"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                aria-label="検索キーワード"
                autoComplete="off"
              />
              <button
                type="button"
                className="search-close"
                onClick={closeModal}
                aria-label="閉じる"
              >
                Esc
              </button>
            </div>

            <div className="search-results" role="listbox" aria-label="検索結果">
              {query.trim() && hits.length === 0 && (
                <p className="search-empty">
                  {records
                    ? `「${query}」に一致するカルテは見つかりませんでした。`
                    : "読み込み中…"}
                </p>
              )}
              {hits.map((hit, i) => (
                <div
                  key={`${hit.record.billId}-${hit.record.section ?? "head"}`}
                  className={`search-hit${i === active ? " active" : ""}`}
                  role="option"
                  aria-selected={i === active}
                  tabIndex={0}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(hit)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      go(hit);
                    }
                  }}
                >
                  <span className="search-hit-head">
                    <span className="search-hit-title">{hit.record.billTitle}</span>
                    <span className="search-hit-badge">{hit.record.badge}</span>
                    <span className="search-hit-session">第{hit.record.session}回</span>
                  </span>
                  <span className="search-hit-meta">
                    {hit.record.section && (
                      <span className="search-hit-section">
                        {hit.record.sectionLabel}
                      </span>
                    )}
                    {hit.otherSections > 0 && (
                      <span className="search-hit-more">
                        他{hit.otherSections}箇所でも一致
                      </span>
                    )}
                  </span>
                  <span className="search-hit-snippet">
                    {hit.snippet.before}
                    <mark>{hit.snippet.match}</mark>
                    {hit.snippet.after}
                  </span>
                </div>
              ))}
            </div>

            <div className="search-foot">
              <span>↑↓ で移動・Enter で開く</span>
              <span>会期をまたいで検索（新しい会期を優先表示）</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
