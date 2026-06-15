import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "法案カルテとは",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/about/" },
};

// よくある質問（このリストが画面表示と FAQPage 構造化データの単一の出どころ）
const FAQ = [
  {
    q: "法案カルテとは何ですか？",
    a: "いま国会で審議されている重要な法律案を、報道の論調ではなく、国会の議案情報・会議録・省庁資料といった一次情報だけを材料に、決まった型（8つの観点）で中立に整理する無料・非営利のサイトです。賛成・反対の結論は出さず、読んだ人が自分で判断できる状態をつくることを目的にしています。",
  },
  {
    q: "ニュースサイトと何が違うのですか？",
    a: "ニュースは「いま何が起きたか」を速報し、しばしば賛否や評価を伴います。法案カルテは速報も評価もせず、「この法案で、現行制度が・どこに対して・どう変わるのか」を、出典付きで一枚に整理します。各記述には一次資料へのリンクが付き、要約はあくまで入口で、原典が正です。",
  },
  {
    q: "「中立」と言いますが、本当に偏っていませんか？",
    a: "完全な中立は構造的に不可能だと考えています。何を課題として立て、どの論点を載せるかには、どうしても選択が入ります。だからこそ、賛否にあたる見解は必ず「どの会派・どの主体が、どの場で述べたか」を明示し、運営の評価を混ぜません。判断が入りうる場所は、隠さず別ページで宣言しています。",
  },
  {
    q: "誰が運営していて、お金はかかりますか？",
    a: "個人が運営する非営利・無料のサイトです。広告・有料記事・寄付の受付はありません。アクセス解析・Cookie・広告タグも使いません。運営者は所属する組織・勤務先とは無関係に、個人の活動として運営しています。",
  },
  {
    q: "どの法案を読めますか？",
    a: "いま開かれている国会のうち、関心が高く論点のある法案を選んでカルテにしています。本数は編集できる範囲に限られます。作成済みのカルテと、今国会に提出された法律案の一覧は法案一覧ページで確認できます。",
  },
];

export default function AboutPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: "ja",
    isAccessibleForFree: true,
  };

  return (
    <div className="wrap-sm">
      <JsonLd data={siteLd} />
      <JsonLd data={faqLd} />

      <header className="mast">
        <div className="wrap">
          <p className="eyebrow">法案カルテ ／ About</p>
          <h1 className="serif">法案カルテとは</h1>
          <p className="sub">
            重要法案を一次情報で中立に整理する、無料・非営利のサイトです。
          </p>
        </div>
      </header>

      <main className="wrap">
        <section>
          <p className="lead">
            <b>法案カルテ</b>
            は、いま国会で審議されている重要な法律案を、報道の論調ではなく、国会の議案情報・会議録・省庁資料といった
            <b>一次情報だけ</b>を材料に、決まった型（8つの観点）で
            <b>中立に整理</b>
            する無料・非営利のサイトです。賛成・反対の結論は出さず、読んだ人が自分で判断できる状態をつくることを目的にしています。
          </p>
          <div className="principles-grid">
            <div className="p">
              <div className="pt">一次情報だけ</div>
              <div className="pd">
                国会の議案・会議録、各党の発信、省庁資料を材料にします。報道は原則として材料にしません。
              </div>
            </div>
            <div className="p">
              <div className="pt">所在を示す</div>
              <div className="pd">
                「正しいのはどちらか」ではなく「何がどこで、どう違うか」を示します。賛否の判断は委ねます。
              </div>
            </div>
            <div className="p">
              <div className="pt">すべてに出典</div>
              <div className="pd">
                記述には出典番号を付け、元の一次資料へ直接たどれます。要約は出発点で、原典が正です。
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="shead">
            <span className="num">◇</span>
            <h2 className="serif">1本のカルテで分かること</h2>
          </div>
          <p className="lead">
            すべてのカルテは同じ8つの観点で書かれています。法案ごとに体裁が変わらないので、別の法案でも同じ読み方で比べられます。
          </p>
          <ul className="do">
            <li>① 前提となる現行制度（いま、どういう仕組みなのか）</li>
            <li>② 何が課題とされているか（推進・慎重の両側から）</li>
            <li>③ この法律で「こう変わる」（現行 → 改正後）</li>
            <li>④ 対案・主な論点（どの会派が何を述べたか）</li>
            <li>⑤ 会期と採決の結果（審議の段取り）</li>
            <li>⑥ これまでの経緯（時系列）</li>
            <li>⑦ 設計・方向性の選択（分かれ目はどこか）</li>
            <li>⑧ よくある声と、その射程（どこまでがこの法律の話か）</li>
          </ul>
        </section>

        <section>
          <div className="shead">
            <span className="num">⇄</span>
            <h2 className="serif">報道・解説との違い</h2>
          </div>
          <div className="panel">
            ニュースは「いま何が起きたか」を速報し、しばしば賛否や評価を伴います。法案カルテは
            <b>速報も評価もせず</b>
            、「この法案で、現行制度が・どこに対して・どう変わるのか」を、出典付きで一枚に整理します。各記述には一次資料へのリンクが付き、
            <b>要約はあくまで入口で、原典が正</b>です。
          </div>
        </section>

        <section>
          <div className="shead">
            <span className="num">?</span>
            <h2 className="serif">よくある質問</h2>
          </div>
          <dl className="faq">
            {FAQ.map((f, i) => (
              <div className="faq-item" key={i}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <div className="shead">
            <span className="num">→</span>
            <h2 className="serif">次に読む</h2>
          </div>
          <ul className="do">
            <li>
              <Link href="/bills/">
                法案一覧 — 作成済みのカルテと、今国会の法律案
              </Link>
            </li>
            <li>
              <Link href="/about/how-laws-pass/">
                国会で法案が成立するまで — 提出から公布・施行までの流れ
              </Link>
            </li>
            <li>
              <Link href="/about/limits/">
                このサイトの方針と、中立性の限界
              </Link>
            </li>
          </ul>
        </section>

        <p className="back">
          <Link href="/">← トップ（法案一覧）へ戻る</Link>
        </p>
      </main>
    </div>
  );
}
