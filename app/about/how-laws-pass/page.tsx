import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "国会で法案が成立するまで",
  description:
    "法律案はだれが出し、委員会と本会議でどう審議され、衆議院・参議院を経てどの時点で「成立」するのか。提出から公布・施行までの流れを、日本国憲法・国会法など一次資料にもとづいて中立に整理します。",
  alternates: { canonical: "/about/how-laws-pass/" },
};

// 一次資料（このページの記述はすべてここに対応）
const SOURCES = [
  { label: "日本国憲法（e-Gov 法令検索）", url: "https://laws.e-gov.go.jp/law/321CONSTITUTION" },
  { label: "国会法（e-Gov 法令検索）", url: "https://laws.e-gov.go.jp/law/322AC1000000079" },
  {
    label: "参議院「法律ができるまで」（国会の基礎知識）",
    url: "https://www.sangiin.go.jp/japanese/aramashi/houritu.html",
  },
];

const STEPS = [
  {
    n: "1",
    title: "だれが法案を出すのか（提出）",
    body: "法律案を提出できるのは、内閣と国会議員です。内閣が出すものを「閣法（内閣提出法律案）」、議員が出すものを「議員立法」と呼びます。議員が提出するには一定数の賛成者が必要で、予算を伴う法案ではその要件が重くなります（国会法第56条）。",
  },
  {
    n: "2",
    title: "委員会で審査する（二段階審議の前半）",
    body: "提出された法案は、まず専門の委員会に付託されます。委員会では大臣・提出者への質疑や参考人の意見聴取などを通じて中身を審査し、採決します。日本の国会は本会議より先に委員会で実質審議を行う「委員会中心主義」をとっています。",
  },
  {
    n: "3",
    title: "本会議で採決する（二段階審議の後半）",
    body: "委員会で可決された法案は、その院の本会議にかけられ、採決されます。ここで可決されると、その法案は「一方の院を通過した」ことになり、もう一方の院へ送られます。",
  },
  {
    n: "4",
    title: "もう一方の院でも同じ手順を踏む（両院）",
    body: "衆議院と参議院は、それぞれ独立に委員会・本会議の手順を踏みます。先に審議する院を「先議」と呼びます。両院がともに可決すると、法律案は法律となります（日本国憲法第59条第1項）。",
  },
  {
    n: "5",
    title: "両院の議決が分かれたとき（衆議院の優越）",
    body: "衆議院が可決した法案を参議院が否決・修正した場合などには、両院協議会が開かれることがあります。それでも一致しないとき、衆議院が出席議員の3分の2以上の多数で再び可決すれば、法律となります（日本国憲法第59条第2項）。これを「衆議院の優越」といいます。",
  },
  {
    n: "6",
    title: "成立・公布・施行（効力を持つまで）",
    body: "両院で可決して法律が「成立」した後、その法律は天皇によって「公布」されます（日本国憲法第7条第1号）。さらに、実際に効力を持ち始める日を「施行」といい、施行日は法律の附則や政令で定められます。「成立」「公布」「施行」は別の段階で、日付もそれぞれ異なります。",
  },
];

const FAQ = [
  {
    q: "法案はだれが提出できますか？",
    a: "内閣（閣法）と国会議員（議員立法）です。議員が提出するには一定数の賛成者が必要で、予算を伴う法案では要件が重くなります（国会法第56条）。",
  },
  {
    q: "委員会と本会議はどう違いますか？",
    a: "委員会は専門分野ごとに分かれ、質疑や参考人聴取を通じて法案を実質的に審査する場です。本会議はその院の全議員による最終的な採決の場です。日本の国会は委員会で実質審議を行う「委員会中心主義」をとっています。",
  },
  {
    q: "衆議院と参議院、どちらが先ですか？",
    a: "法律案はどちらの院から審議を始めてもかまいません（先に審議する院を「先議」と呼びます）。ただし予算は衆議院に先に提出することが憲法で定められています（第60条）。",
  },
  {
    q: "「成立」と「公布」「施行」はどう違いますか？",
    a: "「成立」は両院で可決された時点、「公布」は成立した法律を国民に知らせる手続き（天皇の国事行為）、「施行」は実際に効力を持ち始める日です。三つは別の段階で、日付もそれぞれ異なります。",
  },
  {
    q: "会期内に成立しなかった法案はどうなりますか？",
    a: "国会には会期があり、会期内に議決されなかった案件は原則として次の会期に引き継がれず廃案になります（会期不継続の原則・国会法第68条）。ただし委員会が議決すれば、閉会中も審査を続ける「継続審議」となる場合があります。",
  },
];

export default function HowLawsPassPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "国会で法案が成立するまで — 提出から公布・施行までの流れ",
    description: metadata.description,
    inLanguage: "ja",
    isAccessibleForFree: true,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: `${SITE_URL}/about/how-laws-pass/`,
  };

  return (
    <div className="wrap-sm">
      <JsonLd data={articleLd} />
      <JsonLd data={faqLd} />

      <header className="mast">
        <div className="wrap">
          <p className="eyebrow">法案カルテ ／ Guide</p>
          <h1 className="serif">国会で法案が成立するまで</h1>
          <p className="sub">提出から公布・施行までの流れを、一次資料で整理します。</p>
        </div>
      </header>

      <main className="wrap">
        <section>
          <p className="lead">
            法律案は、<b>内閣（閣法）または国会議員（議員立法）</b>
            が提出し、衆議院・参議院それぞれで
            <b>「委員会の審査」→「本会議の採決」</b>を経て、
            <b>両院で可決されると成立</b>します（日本国憲法第59条第1項）。成立した法律は天皇が
            <b>公布</b>し、決められた日（<b>施行日</b>
            ）から効力を持ちます。「成立」「公布」「施行」は別の段階です。
          </p>
        </section>

        <section>
          <div className="shead">
            <span className="num">◇</span>
            <h2 className="serif">提出から施行までの6ステップ</h2>
          </div>
          {STEPS.map((s) => (
            <div className="lim" key={s.n}>
              <div className="n">{s.n}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
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
            <span className="num">▤</span>
            <h2 className="serif">このページの一次資料</h2>
          </div>
          <p className="lead">
            このページの記述は、次の一次資料にもとづいています。正確・最新の内容は、必ずリンク先の原典でご確認ください。
          </p>
          <ul className="do">
            {SOURCES.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="panel" style={{ marginTop: 14 }}>
            ここで示すのは一般的な流れです。予算・条約・内閣総理大臣の指名などには、衆議院の優越に関する別の特則があります。個別の法案が実際にどの委員会で、いつ採決されたかは、各
            <Link href="/bills/">カルテ</Link>の「会期と採決」で確認できます。
          </div>
        </section>

        <p className="back">
          <Link href="/about/">← 法案カルテとは へ戻る</Link>
        </p>
      </main>
    </div>
  );
}
