import type { Metadata } from "next";
import Link from "next/link";
import { PRIMARY_SOURCE_DISPLAY } from "@/lib/primary-sources";

export const metadata: Metadata = {
  title: "訂正・連絡の窓口",
  description:
    "記述の誤り・出典との不一致の報告窓口。該当箇所の引用・一次情報・修正案の3点を添えて、GitHub の構造化フォームから報告できます。",
};

const ISSUE_FORM_URL =
  "https://github.com/ssnkgw-spec/houan-karte/issues/new?template=correction.yml";
const SECURITY_URL =
  "https://github.com/ssnkgw-spec/houan-karte/security/advisories/new";

export default function CorrectionsPage() {
  return (
    <div className="wrap-sm">
      <header className="mast">
        <div className="wrap">
          <p className="eyebrow">法案カルテ ／ Corrections</p>
          <h1 className="serif">訂正・連絡の窓口</h1>
          <p className="sub">
            記述の誤りや出典との不一致は、ここから報告できます。これは苦情箱ではなく、
            <b>一次情報に基づいて事実を正すための窓口</b>です。
          </p>
        </div>
      </header>

      <main className="wrap">
        <div className="frame">
          <div className="ft">この窓口の立場</div>
          <ul className="do">
            <li>
              扱うのは<b>事実の誤り・出典との不一致</b>
              です。賛否や論調についてのご意見は対象外です。
            </li>
            <li>
              報告には<b>①該当箇所の引用 ②一次情報 ③修正案</b>
              の3点が必要です（理由は下記）。
            </li>
            <li>
              <b>正当な形式の報告でも、必ず修正されるとは限りません。</b>
              確認の結果、修正・補足・対応見送り（理由つき）のいずれかになります。
            </li>
          </ul>
        </div>

        <section>
          <div className="shead">
            <span className="num">1</span>
            <h2 className="serif">報告に必要な3点</h2>
          </div>
          <p className="lead">
            この3点がそろわない報告は、自動チェックの段階でお返しします。手間に見えますが、これが「言った／言わない」を避け、誰でも検証できる訂正にするための最低条件です。
          </p>
          <div className="ch">
            <span className="tag">① 該当箇所</span>
            <h3>カルテ本文の、どこが誤っているか（正確な引用）</h3>
            <p>
              どのカルテの、どの記述が誤りかを、本文をそのまま引用して示してください。引用が本文に見つからない場合は自動でお返しします。
            </p>
          </div>
          <div className="ch">
            <span className="tag">② 一次情報</span>
            <h3>正しい情報がある一次情報のURLと、その原文引用</h3>
            <p>
              「正しくはこうだ」の根拠を、<b>本サイトが一次情報とするサイト</b>
              のURLと、その原文の引用で示してください。報道・SNS・個人サイトのみを根拠とする報告は受け付けられません。
            </p>
            <div className="lim2">
              <b>対象とする一次情報</b>
              <ul className="do" style={{ margin: "6px 0 0" }}>
                {PRIMARY_SOURCE_DISPLAY.map((s) => (
                  <li
                    key={s}
                    style={{ padding: "5px 0 5px 26px", borderBottom: "none" }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="ch">
            <span className="tag">③ 修正案</span>
            <h3>どう直すべきか（具体的に）</h3>
            <p>
              ②をふまえ、どう書き換えるべきかを具体的に書いてください。ここは内容を審議し、修正・補足・対応見送りを判断します。
            </p>
          </div>
        </section>

        <section>
          <div className="shead">
            <span className="num">2</span>
            <h2 className="serif">報告する</h2>
          </div>
          <p className="lead">
            報告は GitHub の構造化フォームで受け付けます。①②③が未入力だと送信できないようになっています。
          </p>
          <p>
            <a
              className="cta"
              href={ISSUE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub の報告フォームを開く →
            </a>
          </p>
          <div className="lim2">
            <b>ご注意</b>
            　送信には GitHub アカウントが必要です。報告内容は<b>公開</b>
            されます（訂正の経緯を誰でも検証できるようにするためです）。氏名・連絡先などの個人情報は書かないでください。
          </div>
        </section>

        <section>
          <div className="shead">
            <span className="num alt">→</span>
            <h2 className="serif">送信したあとの流れ</h2>
          </div>
          <ul className="do">
            <li>
              <b>自動チェック</b>
              ：①の引用がカルテ本文にあるか、②のURLが一次情報の対象か、各欄が埋まっているかを機械的に確認します。満たさないものは、その場で不足点をお返しします。
            </li>
            <li>
              <b>内容の確認</b>
              ：通過したものは、②が①の訂正を支持しているか、③が妥当かを確認します。
            </li>
            <li>
              <b>結果</b>
              ：<b>修正</b>・<b>補足コメント</b>・
              <b>対応見送り（理由つき）</b>のいずれかにします。理由は報告（GitHub
              Issue）に残します。修正・補足は
              <Link href="/about/changelog/">更新履歴</Link>に記録します。
            </li>
          </ul>
        </section>

        <section>
          <div className="shead">
            <span className="num">−</span>
            <h2 className="serif">受け付けないもの</h2>
          </div>
          <ul className="donot">
            <li>個人への攻撃・誹謗中傷、特定の主張への賛否の要求。</li>
            <li>一次情報の引用がない、または対象外の情報源だけを根拠とするもの。</li>
            <li>報道・SNS・伝聞のみを根拠とする「こう書かれていた」という指摘。</li>
            <li>事実の誤りではなく、解釈・論調・取り上げ方への異議。</li>
          </ul>
        </section>

        <section>
          <div className="shead">
            <span className="num src">!</span>
            <h2 className="serif">セキュリティ上の問題</h2>
          </div>
          <p>
            サイトの脆弱性など機微な問題は、公開の報告フォームではなく{" "}
            <a href={SECURITY_URL} target="_blank" rel="noopener noreferrer">
              GitHub セキュリティ勧告
            </a>
            から非公開でご連絡ください（
            <a
              href="/.well-known/security.txt"
              target="_blank"
              rel="noopener noreferrer"
            >
              security.txt
            </a>
            ）。
          </p>
        </section>

        <p className="back">
          <Link href="/about/limits/">このサイトの方針と限界</Link>
          {" ／ "}
          <Link href="/about/changelog/">更新履歴</Link>
          {" ／ "}
          <Link href="/">← トップへ戻る</Link>
        </p>
      </main>
    </div>
  );
}
