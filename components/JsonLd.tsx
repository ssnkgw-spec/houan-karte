/**
 * 構造化データ（JSON-LD）を埋め込む。
 * GEO/SEO 向けに、AI検索・検索エンジンがページの意味を機械的に読めるようにする。
 * 純静的（output:export）でもビルド時に文字列化されるため実行時コストはない。
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // 信頼できる自前データのみを渡す（ユーザー入力は混ぜない）
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
