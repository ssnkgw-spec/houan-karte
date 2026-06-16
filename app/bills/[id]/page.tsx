import type { Metadata } from "next";
import { bills, getBill } from "@/content/bills";
import { KarteBlock } from "@/components/KarteBlocks";
import { RichText } from "@/components/RichText";
import { JsonLd } from "@/components/JsonLd";
import { VotesPanel } from "@/components/VotesPanel";
import { EnforcementSchedule } from "@/components/EnforcementSchedule";
import { formatYmdJa } from "@/lib/session-clock";
import { getStaleNotice } from "@/lib/pending-refresh";
import { toPlainText } from "@/lib/plain-text";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import billsStatusAuto from "@/content/data/bills-status.json";
import type { BillStatusAuto, Section } from "@/content/schema";
import Link from "next/link";

export function generateStaticParams() {
  return bills.map((b) => ({ id: b.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const bill = getBill((await params).id);
  return {
    title: bill.card.title,
    description: bill.card.desc,
    alternates: { canonical: `/bills/${bill.id}/` },
    openGraph: { title: bill.card.title, description: bill.card.desc },
  };
}

const SECTION_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;
const NUMS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"] as const;

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const bill = getBill((await params).id);
  const auto = (billsStatusAuto as BillStatusAuto)[bill.id];
  const stale = getStaleNotice(bill.id, bill.statusAsOf);
  const rt = (text: string) => <RichText text={text} sources={bill.sources} />;

  // ⑧「よくある声と射程」の表を FAQPage 構造化データに流用（GEO 対策）
  const scopeBlock = bill.sections.s8.blocks.find(
    (b): b is Extract<typeof b, { type: "scope" }> => b.type === "scope"
  );
  const url = `${SITE_URL}/bills/${bill.id}/`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: bill.card.title,
    description: bill.card.desc,
    inLanguage: "ja",
    isAccessibleForFree: true,
    datePublished: bill.statusAsOf,
    dateModified: auto?.asOf ?? bill.statusAsOf,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: url,
  };
  const faqLd =
    scopeBlock && scopeBlock.rows.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: scopeBlock.rows.map((r) => ({
            "@type": "Question",
            name: toPlainText(r.topic),
            acceptedAnswer: {
              "@type": "Answer",
              text: toPlainText(r.where),
            },
          })),
        }
      : null;

  const renderSection = (key: (typeof SECTION_KEYS)[number], i: number) => {
    const sec: Section = bill.sections[key];
    return (
      <section id={key} key={key}>
        <div className="shead">
          <span className="num">{NUMS[i]}</span>
          <h2 className="serif">{sec.title}</h2>
        </div>
        {sec.lead && <p className="lead">{rt(sec.lead)}</p>}
        {sec.blocks.map((block, j) => (
          <KarteBlock block={block} sources={bill.sources} key={j} />
        ))}
      </section>
    );
  };

  return (
    <>
      <JsonLd data={articleLd} />
      {faqLd && <JsonLd data={faqLd} />}

      <header className="mast">
        <div className="wrap">
          <p className="eyebrow">法案カルテ ／ Bill Dossier</p>
          <h1 className="title serif">{bill.title}</h1>
          <p className="subtitle">{bill.subtitle}</p>

          <div className="card">
            <div className="reg">
              {bill.registry.map((row, i) => (
                <div key={i}>
                  <span className="k">{row.k}</span>
                  <span className="v">{rt(row.v)}</span>
                </div>
              ))}
              <div>
                <span className="k">審議状況</span>
                <span className="status">{rt(bill.status)}</span>
              </div>
              {/* 記載時点の定位置表示（UX必須対応②） */}
              <div>
                <span className="k">記載時点</span>
                <span className="v mono" style={{ fontSize: 13.5 }}>
                  {formatYmdJa(bill.statusAsOf)}
                </span>
              </div>
            </div>
            {stale && (
              <p className="stale-note" role="status">
                <b>審議に進展があり、本文はまだ反映されていません。</b>
                議案DBでは「{stale.dbStatus}」（{formatYmdJa(stale.changedAt)}{" "}
                観測）。本文は {formatYmdJa(bill.statusAsOf)} 時点の内容です。最新は
                {stale.keikaUrl ? (
                  <a href={stale.keikaUrl} target="_blank" rel="noopener noreferrer">
                    経過情報
                  </a>
                ) : (
                  "議案DB"
                )}
                でご確認ください。
              </p>
            )}
            {auto && (
              <p className="autostatus">
                <span className="mono">議案DB照合（自動更新）</span>：
                {auto.status}（{auto.asOf} 時点・
                {auto.keikaUrl ? (
                  <a href={auto.keikaUrl} target="_blank" rel="noopener noreferrer">
                    経過を見る
                  </a>
                ) : (
                  "スマートニュース 国会議案DB"
                )}
                ）
              </p>
            )}
            <p className="srclabel">一次資料へのリンク</p>
            <div className="srcrow">
              {bill.quickLinks.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <div className="neutral">
            <b>このページの方針</b>　{rt(bill.policyNote)}
          </div>
        </div>
      </header>

      <nav className="toc" aria-label="このページの目次">
        <div className="wrap">
          {SECTION_KEYS.map((key, i) => (
            <a href={`#${key}`} key={key}>
              <span className="n">{NUMS[i]}</span>
              {bill.sections[key].tocLabel}
            </a>
          ))}
          <a href="#sanka">
            <span className="n">◇</span>参加（任意）
          </a>
          <a href="#src">
            <span className="n">◇</span>出典
          </a>
        </div>
      </nav>

      <main className="wrap">
        {SECTION_KEYS.map((key, i) => renderSection(key, i))}

        {bill.votes && bill.votes.length > 0 && (
          <section id="votes">
            <div className="shead">
              <span className="num alt">◇</span>
              <h2 className="serif">採決の結果（会派別）</h2>
            </div>
            <p className="lead">
              どの会派が賛成・反対したかの記録です。事実の整理であり、
              賛否のどちらかを勧めるものではありません。
            </p>
            <VotesPanel votes={bill.votes} sources={bill.sources} />
          </section>
        )}

        {bill.enforcement && (
          <section id="enforcement">
            <div className="shead">
              <span className="num alt">◇</span>
              <h2 className="serif">施行スケジュール</h2>
            </div>
            <p className="lead">
              「成立」と「施行（実際に効力が出ること）」は別です。いつから変わるかの記録です。
            </p>
            <EnforcementSchedule bills={[bill]} />
          </section>
        )}

        <section id="sanka">
          <div className="shead">
            <span className="num alt">◇</span>
            <h2 className="serif">意見を伝えたい場合の経路（任意）</h2>
          </div>
          <p className="lead">
            読んだうえで意見を伝えたい人のための参照です。賛成・反対・保留のいずれでも経路は同じで、
            <b>伝えないことも同じく正当な選択</b>です。呼びかけではありません。
          </p>
          <div className="issue">
            <div className="lab">{bill.participation.label}</div>
            <p>{rt(bill.participation.text)}</p>
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            請願・会派窓口・公聴会など、法案を問わず共通の仕組みは{" "}
            <Link href="/participate/">参加の経路</Link>{" "}
            にまとめています。窓口は制度的なもので、効果が保証されるものではありません。
          </p>
        </section>

        <section id="src" className="sources">
          <div className="shead">
            <span className="num src">◇</span>
            <h2 className="serif">出典（一次情報）</h2>
          </div>
          <ol className="srclist">
            {bill.sources.map((s) => (
              <li key={s.id} id={`src-${s.id}`}>
                {s.title} —{" "}
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {new URL(s.url).hostname.replace(/^www\./, "")}
                </a>
                {s.note && <>（{s.note}）</>}
              </li>
            ))}
          </ol>
        </section>

        <p className="closingnote">
          {bill.closingNote && <>{rt(bill.closingNote)}　</>}
          中立性の限界については{" "}
          <Link href="/about/limits/">「このサイトの限界」</Link>
          、ほかの法案は <Link href="/">トップ</Link> を参照してください。
        </p>
      </main>
    </>
  );
}
