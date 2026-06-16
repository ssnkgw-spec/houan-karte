import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { SiteSearch } from "@/components/SiteSearch";

// フォントは @fontsource で完全セルフホスト（ビルド時・実行時とも外部リクエスト0）
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/700.css";
import "@fontsource/noto-serif-jp/500.css";
import "@fontsource/noto-serif-jp/600.css";
import "@fontsource/noto-serif-jp/700.css";
import "@fontsource/roboto-mono/400.css";
import "@fontsource/roboto-mono/500.css";
import "@fontsource/roboto-mono/700.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}｜重要法案を一次情報で中立に`,
    template: `%s｜${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "ja_JP",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <a className="skiplink" href="#main">
          本文へスキップ
        </a>
        <header className="siteheader">
          <div className="wrap wrap-lg">
            <Link className="brand" href="/">
              法案カルテ
            </Link>
            <span className="tag">試作 / PROTOTYPE</span>
            <nav aria-label="サイト共通">
              <Link href="/bills/">法案一覧</Link>
              <Link href="/about/">法案カルテとは</Link>
              <Link href="/participate/">参加の経路</Link>
              <Link href="/about/limits/">方針と限界</Link>
            </nav>
            <SiteSearch />
          </div>
        </header>
        <div id="main">{children}</div>
        <footer className="sitefooter">
          <div className="wrap wrap-lg">
            <p className="mono">法案カルテ ／ Bill Dossier ／ PROTOTYPE</p>
            <p>
              重要法案を一次情報ベースで中立に整理する構想の試作です。記載は各ページ明記の時点の要約であり、審議の進行により内容は変わります。正確・最新の情報は必ず各リンク先の一次資料でご確認ください。誤りが見つかれば訂正し、更新履歴を残します。
            </p>
            <nav aria-label="フッター">
              <Link href="/">トップ</Link>
              <Link href="/bills/">法案一覧</Link>
              <Link href="/about/">法案カルテとは</Link>
              <Link href="/about/how-laws-pass/">国会で法案が成立するまで</Link>
              <Link href="/about/limits/">このサイトの方針と限界</Link>
              <Link href="/participate/">参加の経路</Link>
              <Link href="/about/corrections/">訂正・連絡</Link>
              <Link href="/about/changelog/">更新履歴</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
