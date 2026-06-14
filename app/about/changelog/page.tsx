import type { Metadata } from "next";
import Link from "next/link";
import { Changelog } from "@/content/schema";
import changelogRaw from "@/content/data/changelog.json";

export const metadata: Metadata = {
  title: "更新履歴",
  description:
    "法案カルテの修正・補足・お知らせの記録。誤りの訂正は、いつ何を直したかをここに残します。",
};

// kind → ログのバッジ色（既存 .log .badge を流用）
const KIND_TONE: Record<string, string> = {
  修正: "b-done",
  補足: "b-next",
  新規: "b-done",
  お知らせ: "b-plan",
};

export default function ChangelogPage() {
  const entries = Changelog.parse(changelogRaw);

  return (
    <div className="wrap-sm">
      <header className="mast">
        <div className="wrap">
          <p className="eyebrow">法案カルテ ／ Changelog</p>
          <h1 className="serif">更新履歴</h1>
          <p className="sub">
            記述の修正・補足と、サイトのお知らせの記録です。会期や審議状況などの機械的な数値は別に毎日自動更新しており、その最終更新日時は各ページに表示しています。
          </p>
        </div>
      </header>

      <main className="wrap">
        {entries.length === 0 ? (
          <p className="lead">まだ記録はありません。</p>
        ) : (
          <ul className="log">
            {entries.map((e, i) => (
              <li key={i}>
                <span className="d">{e.date}</span>
                <span className={`badge ${KIND_TONE[e.kind] ?? "b-plan"}`}>
                  {e.kind}
                </span>
                <span className="ev">
                  <b>{e.title}</b>
                  <br />
                  {e.summary}
                  {(e.billId || e.sourceUrl || e.issueUrl) && (
                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 12.5,
                      }}
                    >
                      {e.billId && (
                        <Link href={`/bills/${e.billId}/`}>→ 該当カルテ</Link>
                      )}
                      {e.sourceUrl && (
                        <>
                          {e.billId ? " ／ " : ""}
                          <a
                            href={e.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            一次情報 ↗
                          </a>
                        </>
                      )}
                      {e.issueUrl && (
                        <>
                          {e.billId || e.sourceUrl ? " ／ " : ""}
                          <a
                            href={e.issueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            報告 ↗
                          </a>
                        </>
                      )}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="back">
          <Link href="/about/corrections/">訂正・連絡の窓口へ</Link>
          {" ／ "}
          <Link href="/">← トップへ戻る</Link>
        </p>
      </main>
    </div>
  );
}
