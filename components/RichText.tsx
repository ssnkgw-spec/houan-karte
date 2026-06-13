import type { ReactNode } from "react";
import type { SourceRef } from "@/content/schema";

/**
 * カルテ本文のインライン記法をビルド時にHTMLへ展開する。
 *   **強調** → <b>
 *   {1} {1,2} → 出典への上付き直リンク（プロトタイプのクライアントJS書き換えを静的生成に置換）
 *   [表示名](URL) → 外部リンク（#始まりはページ内リンク）
 */
const TOKEN =
  /(\*\*.+?\*\*)|(\{[\d,\s]+\})|(\[[^\]]+\]\((?:https?:\/\/|#)[^)]*\))/g;

export function RichText({
  text,
  sources,
}: {
  text: string;
  sources?: SourceRef[];
}) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) nodes.push(text.slice(last, idx));
    const tok = m[0];

    if (tok.startsWith("**")) {
      nodes.push(<b key={key++}>{tok.slice(2, -2)}</b>);
    } else if (tok.startsWith("{")) {
      const ids = tok
        .slice(1, -1)
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
      for (const id of ids) {
        const src = sources?.find((s) => s.id === id);
        nodes.push(
          src ? (
            <a
              key={key++}
              className="ref"
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`出典: ${src.title}`}
            >
              [{id}]
            </a>
          ) : (
            <a key={key++} className="ref" href="#src">
              [{id}]
            </a>
          )
        );
      }
    } else {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)]*)\)$/);
      if (lm) {
        const [, label, href] = lm;
        nodes.push(
          href.startsWith("#") ? (
            <a key={key++} href={href}>
              {label}
            </a>
          ) : (
            <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          )
        );
      } else {
        nodes.push(tok);
      }
    }
    last = idx + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
