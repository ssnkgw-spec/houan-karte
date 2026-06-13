import type { Metadata } from "next";
import Link from "next/link";
import { bills } from "@/content/bills";
import cabinetRaw from "@/content/data/cabinet-bills.json";
import { CabinetBillsList } from "@/content/schema";
import { formatYmdJa } from "@/lib/session-clock";

export const metadata: Metadata = {
  title: "法案一覧",
  description:
    "法案カルテのある法案と、今国会に提出された法律案（内閣提出・議員立法）の全件リスト。審議状況ごとに、件名・公布日・経過情報をまとめています。",
};

type Ledger = CabinetBillsList["cabinet"];

// 状況の表示順（これ以外の状況は後ろに回す）
const STATUS_ORDER = ["成立", "本院議了", "参議院で審議中", "衆議院で審議中"];
// 状況バッジの色（live=審議中・indigo / done=成立・slate）
const STATUS_TONE: Record<string, "live" | "done"> = {
  成立: "done",
  本院議了: "live",
  参議院で審議中: "live",
  衆議院で審議中: "live",
};

function groupByStatus(ledger: Ledger) {
  const ordered = [
    ...STATUS_ORDER.filter((s) => s in ledger.counts),
    ...Object.keys(ledger.counts).filter((s) => !STATUS_ORDER.includes(s)),
  ];
  return ordered.map((status) => ({
    status,
    tone: STATUS_TONE[status] ?? "done",
    items: ledger.bills.filter((b) => b.status === status),
  }));
}

function LedgerGroups({
  ledger,
  showKind,
}: {
  ledger: Ledger;
  showKind?: boolean;
}) {
  return (
    <>
      {groupByStatus(ledger).map((g) => (
        <section className="bgroup" key={g.status} aria-label={g.status}>
          <div className="bgrouphead">
            <span className={`sbadge ${g.tone}`}>{g.status}</span>
            <h3 className="serif">{g.status}</h3>
            <span className="cnt">{g.items.length}件</span>
          </div>
          <div className="blist">
            {g.items.map((b) => (
              <div
                className={`brow${b.karteId ? " haskarte" : ""}`}
                key={`${b.kind ?? ""}${b.no}`}
              >
                <span className="bno mono">
                  {showKind && b.kind ? `${b.kind} ${b.no}` : b.no}
                </span>
                <div className="bmain">
                  <span className="btitle">{b.title}</span>
                  {b.promulgated && (
                    <span className="bmeta mono">公布 {b.promulgated}</span>
                  )}
                </div>
                {b.karteId ? (
                  <Link className="bkarte" href={`/bills/${b.karteId}/`}>
                    カルテを読む →
                  </Link>
                ) : b.keikaUrl ? (
                  <a
                    className="bkeika"
                    href={b.keikaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    経過 ↗
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export default function BillsIndex() {
  const data = CabinetBillsList.parse(cabinetRaw);
  const cabinetTotal = data.cabinet.bills.length;
  const memberTotal = data.member.bills.length;
  const lawTotal = cabinetTotal + memberTotal;

  return (
    <div className="wrap-lg">
      <header className="hero">
        <div className="wrap">
          <p className="eyebrow">法案カルテ ／ 法案一覧</p>
          <h1 className="serif">いま国会に出ている法案</h1>
          <p className="tagline">
            このサイトで<b>カルテ</b>を用意した法案と、第{data.session}
            回国会に提出された<b>法律案 全{lawTotal}件</b>（内閣提出{cabinetTotal}
            ・議員立法{memberTotal}）を、審議状況ごとに並べています。件名・公布日・経過情報はすべて議案DBの記録です。
          </p>
        </div>
      </header>

      <main className="wrap">
        {/* --- カルテのある法案 --- */}
        <p className="seclabel">Dossiers — 整理ずみのカルテ</p>
        <h2 className="serif">カルテのある法案（{bills.length}件）</h2>
        <p className="h2sub">
          一次情報をもとに、現行法・課題・改正点・対案・審議の段取りまで中立に整理した法案です。閣法（政府提出）と衆法（議員立法）の両方を含みます。下の一覧では、カルテのある法案に「カルテを読む」リンクが付きます。
        </p>
        <div className="grid">
          {bills.map((b) => (
            <Link className="billcard" href={`/bills/${b.id}/`} key={b.id}>
              <div className="meta">
                <span className="badge b-live">{b.card.badge}</span>
                <span className="kind">{b.card.kind}</span>
              </div>
              <h3>{b.card.title}</h3>
              <p className="nick">{b.card.nick}</p>
              <p className="desc">{b.card.desc}</p>
              <div className="foot">
                <span>{b.card.foot}</span>
                <span className="go">カルテを見る →</span>
              </div>
            </Link>
          ))}
        </div>

        {/* --- 内閣提出法案（閣法） --- */}
        <p className="seclabel">Cabinet bills — 内閣提出法案</p>
        <h2 className="serif">
          内閣提出法案・閣法（{cabinetTotal}件）
        </h2>
        <p className="h2sub">
          政府が提出した法律案です。<b>{data.cabinet.counts["成立"] ?? 0}件が成立</b>。
          カルテのある法案には「カルテを読む」、それ以外は衆議院の経過情報へリンクします。
          {formatYmdJa(data.asOf)}時点・
          <a
            href="https://github.com/smartnews-smri/house-of-representatives"
            target="_blank"
            rel="noopener noreferrer"
          >
            スマートニュース 国会議案DB
          </a>
          より。
        </p>
        <LedgerGroups ledger={data.cabinet} />

        {/* --- 議員立法（衆法・参法） --- */}
        <p className="seclabel">Member bills — 議員立法</p>
        <h2 className="serif">議員立法・衆法／参法（{memberTotal}件）</h2>
        <p className="h2sub">
          衆議院・参議院の議員が提出した法律案です。
          <b>{data.member.counts["成立"] ?? 0}件が成立</b>。
          参法（参院議員立法）は、データ元が衆議院DBのため<b>衆院に送付された分のみ</b>
          を掲載しています（実際の提出はこれより多い場合があります）。
        </p>
        <LedgerGroups ledger={data.member} showKind />

        <div className="about">
          <h2 className="serif">なぜ全件は載せて、カルテは少ないのか</h2>
          <p>
            件名・状況・公布日のような<b>機械的な事実</b>
            は議案DBから毎日自動で取り込めるので、全件を載せられます。一方カルテは、一次資料に当たって中立に書き起こす編集作業が要るため、確実に作れる本数だけを少しずつ増やしています。
          </p>
          <p>
            <Link href="/about/limits/">→ このサイトの方針と、越えられない限界</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
