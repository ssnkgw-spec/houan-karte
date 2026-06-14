import Link from "next/link";
import { bills } from "@/content/bills";
import dashboard from "@/content/data/dashboard.json";
import { RichText } from "@/components/RichText";
import {
  formatDateTimeJa,
  formatYmdJa,
  getSessionClock,
} from "@/lib/session-clock";
import { getStaleNotice } from "@/lib/pending-refresh";

export default function Home() {
  const clock = getSessionClock();
  const cb = dashboard.cabinetBills;
  const law = cb.lawTotal;
  const passedPct = law.submitted > 0 ? (law.passed / law.submitted) * 100 : 0;

  return (
    <div className="wrap-lg">
      <header className="hero">
        <div className="wrap">
          <p className="eyebrow">法案カルテ ／ Bill Dossier</p>
          <h1 className="serif">
            いま国会で
            <br />
            何が変わろうとしているか
          </h1>
          <p className="tagline">
            重要な法案を、ニュースの論調ではなく、国会・各党・省庁の
            <b>一次情報だけ</b>
            を材料に、前提の現行法から課題・改正点・対案・審議の段取りまで中立に整理します。判断はあなたに委ねます。
          </p>
          <div className="principles">
            <span>一次情報だけ</span>
            <span>所在を示す・結論は出さない</span>
            <span>すべてに出典リンク</span>
          </div>
        </div>
      </header>

      <main className="wrap">
        <p className="seclabel">Overview — 今国会の全体像</p>
        <h2 className="serif">
          第{clock.number}回国会（{clock.type}）のいま
        </h2>
        <p className="h2sub">
          会期は{formatYmdJa(clock.opensOn)}〜{formatYmdJa(clock.endsOn)}。
          {dashboard.session.note}
        </p>

        <div className="dash">
          <div className="tile">
            <div className="tl">会期 ／ SESSION</div>
            <div className="big">
              残り約{clock.remainingDays}
              <small> 日</small>
            </div>
            <div className="sbar">
              <div className="fill" style={{ width: `${clock.progressPct}%` }} />
              <div className="now" style={{ left: `${clock.progressPct}%` }} />
            </div>
            <div className="legendrow">
              <span>開会 {clock.opensLabel.slice(5)}</span>
              <span>今 {clock.todayLabel}</span>
              <span>会期末 {clock.endsLabel.slice(5)}</span>
            </div>
            <div className="cap">
              会期内に成立しない法案は、原則として廃案になります。
            </div>
          </div>
          <div className="tile">
            <div className="tl">法律案 ／ BILLS</div>
            <div className="big">
              {law.passed}
              <small> 件成立</small>
            </div>
            <div className="mbar">
              <i
                style={{ width: `${passedPct}%`, background: "var(--indigo)" }}
              />
              <i
                style={{
                  width: `${100 - passedPct}%`,
                  background: "var(--slate-line)",
                }}
              />
            </div>
            <div className="legendrow">
              <span>■ 成立 {law.passed}</span>
              <span>□ 審議中など {law.submitted - law.passed}</span>
            </div>
            <div className="breakdown">
              <div>
                <span>内閣提出（閣法）</span>
                <b>
                  {cb.passed} / {cb.submitted}
                </b>
              </div>
              <div>
                <span>議員立法（衆法・参法）</span>
                <b>
                  {cb.member.passed} / {cb.member.submitted}
                </b>
              </div>
            </div>
            <div className="cap">
              今国会に提出された法律案の成立件数（{formatYmdJa(cb.asOf)}時点・
              <a href={cb.sourceUrl} target="_blank" rel="noopener noreferrer">
                {cb.sourceName}
              </a>
              ）。予算・条約・決算は別枠。参法（参院議員立法）は衆院に送付された分の集計です。
            </div>
            <p className="tilelink">
              <Link href="/bills/">
                → 法律案{law.submitted}件すべての内訳を見る
              </Link>
            </p>
          </div>
        </div>
        {/* 数値の鮮度を常時表示（pre-mortemシナリオ2対策） */}
        <p className="updatedat">
          DATA UPDATED — 数値は毎日自動更新（最終更新:{" "}
          <b>{formatDateTimeJa(dashboard.updatedAt)}</b>）
        </p>

        {dashboard.seats.map((sp) => (
          <div className="seatpanel" key={sp.house}>
            <div className="ttl">{sp.title}</div>
            <div className="sc">{sp.caption}</div>
            <div className="seatwrap">
              {sp.markers.map((mk) => (
                <div
                  className="mk"
                  key={mk.label}
                  style={{ left: `${(mk.seats / sp.total) * 100}%` }}
                >
                  {mk.label}
                </div>
              ))}
              <div className="seatbar" style={{ marginTop: 14 }}>
                {sp.groups.map((g) => (
                  <i
                    key={g.name}
                    style={{
                      width: `${(g.seats / sp.total) * 100}%`,
                      background: g.color,
                    }}
                    title={`${g.name} ${g.seats}`}
                  />
                ))}
              </div>
            </div>
            <div className="legend">
              {sp.groups.map((g) => (
                <div key={g.name}>
                  <span className="sw" style={{ background: g.color }} />
                  <b>{g.name}</b>
                  <span>{g.seats}</span>
                </div>
              ))}
            </div>
            <p className="panelnote">
              <RichText text={sp.footnote} />
            </p>
          </div>
        ))}

        <div className="seatpanel">
          <div className="ttl">もうひとつの院 ── 参議院</div>
          <div className="sc">
            法律になるには、衆議院と参議院の<b>両方</b>
            での可決が必要です。いまは二つの院で多数派が逆という、めずらしい状況です。
          </div>
          <div className="houses">
            <div className="hh">
              <div className="hn">衆議院（定数465）</div>
              <div className="hs">
                与党が多数。自民が単独で3分の2（316）。法案を通しやすい。
              </div>
            </div>
            <div className="hh">
              <div className="hn">参議院（定数248）</div>
              <div className="hs">
                与党は過半数（125）を持たない少数与党。法案が止まる関門になりうる。
              </div>
            </div>
          </div>
          <ul className="factlist">
            <li>
              <b>衆院の優越</b>
              ：法律案は、参院が否決または60日以内に議決しないとき、衆院が出席議員の3分の2で再可決すれば成立できる（憲法59条）。予算は衆院に先に提出。
            </li>
            <li>
              両院で意見が分かれると、<b>両院協議会</b>が開かれることがある。
            </li>
            <li>
              参議院には<b>解散がなく</b>
              、任期6年・3年ごとに半数改選。衆院とは選ばれ方も時期も違う。
            </li>
          </ul>
          <p className="panelnote">
            注目は主に衆院の議論に集まりますが、成立の可否は参院の動き次第になることもあります。参院側の経過は{" "}
            <a
              href="https://www.sangiin.go.jp/japanese/joho1/kousei/gian/221/gian.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              参議院 議案情報
            </a>
            、勢力は{" "}
            <a
              href="https://www.sangiin.go.jp/japanese/joho1/kousei/giin/current/giinsu.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              参議院 会派別所属議員数
            </a>{" "}
            で追えます。
          </p>
        </div>

        <p className="seclabel">Before you read — 読む前に</p>
        <h2 className="serif">カルテを読むための前提</h2>
        <p className="h2sub">
          個別の法案ページを読む前に、これだけ知っておくと迷いません。
        </p>
        <div className="primer">
          <div className="flow">
            <span className="st">提出</span>
            <span className="ar">→</span>
            <span className="st">委員会で審査・質疑</span>
            <span className="ar">→</span>
            <span className="st">本会議で採決</span>
            <span className="ar">→</span>
            <span className="st">もう一方の院でも同様</span>
            <span className="ar">→</span>
            <span className="st">成立</span>
            <span className="ar">→</span>
            <span className="st">公布・施行</span>
          </div>
          <div className="notes">
            <div className="nt">
              <span className="nh">だれが出すか</span>
              内閣提出（政府）と、議員立法（議員）がある。
              <span>出し手で進み方も、意見の窓口も変わります。</span>
            </div>
            <div className="nt">
              <span className="nh">会期と時間切れ</span>
              会期内に成立しないと原則は廃案。
              <span>継続審査になれば次の国会へ持ち越されます。</span>
            </div>
            <div className="nt">
              <span className="nh">「成立」と「施行」は別</span>
              成立しても、効力が出る（施行）のは後日のことが多い。
              <span>いつから変わるかは別に確認を。</span>
            </div>
          </div>
        </div>

        <p className="seclabel" id="bills">
          Now in session — 審議中の法案
        </p>
        <h2 className="serif">いま審議されている法案</h2>
        <p className="h2sub">
          関心が高く、いずれも第{clock.number}
          回国会で審議中の法案です。カードを開くと「カルテ」が読めます。
        </p>
        <div className="grid">
          {bills.map((b) => (
            <Link className="billcard" href={`/bills/${b.id}/`} key={b.id}>
              <div className="meta">
                <span className="badge b-live">{b.card.badge}</span>
                <span className="kind">{b.card.kind}</span>
                {getStaleNotice(b.id, b.statusAsOf) && (
                  <span className="stale-chip">進展あり・反映待ち</span>
                )}
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

        <p className="seclabel">Where to look — 一次情報のありか</p>
        <h2 className="serif">どこに何があるか</h2>
        <p className="h2sub">
          各カルテはすべて下記の一次情報をもとにしています。出どころと「正確な立ち位置」を知っておくと、自分で確かめられます。
        </p>
        <div className="srcdir">
          <div className="srcgroup">
            <div className="gl">法案を追う</div>
            <a
              className="si"
              href="https://www.shugiin.go.jp/internet/itdb_gian.nsf/html/gian/menu.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">衆議院 議案情報</span>
              <span className="sd">各法案の審議経過・本文・修正案。まずここ。</span>
            </a>
            <a
              className="si"
              href="https://www.sangiin.go.jp/japanese/joho1/kousei/gian/221/gian.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">参議院 議案情報</span>
              <span className="sd">参院に送られた後の経過・修正。</span>
            </a>
            <a
              className="si"
              href="https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/housei/html/h-shuhou221.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">衆議院 提出法律案一覧</span>
              <span className="sd">その国会に出た議員立法・閣法の一覧。</span>
            </a>
            <a
              className="si"
              href="https://www.clb.go.jp/recent-laws/diet_bill/id=5144"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">内閣法制局 内閣提出法律案</span>
              <span className="sd">政府提出法案の提出・成立の件数と状況。</span>
            </a>
          </div>
          <div className="srcgroup">
            <div className="gl">審議を見る</div>
            <a
              className="si"
              href="https://kokkai.ndl.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">国会会議録検索システム</span>
              <span className="sd">
                衆参・委員会・本会議の質疑の全文。誰が何を言ったか。
              </span>
            </a>
            <a
              className="si"
              href="https://www.shugiintv.go.jp/jp/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">衆議院 インターネット審議中継</span>
              <span className="sd">本会議・委員会の動画。</span>
            </a>
            <a
              className="si"
              href="https://www.webtv.sangiin.go.jp/webtv/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">参議院 インターネット審議中継</span>
              <span className="sd">参院側の動画。</span>
            </a>
          </div>
          <div className="srcgroup">
            <div className="gl">条文・制度</div>
            <a
              className="si"
              href="https://laws.e-gov.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">e-Gov 法令検索</span>
              <span className="sd">
                いま効力のある条文。改正の新旧を当たるならここ。
              </span>
            </a>
            <a
              className="si"
              href="https://public-comment.e-gov.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">e-Gov パブリック・コメント</span>
              <span className="sd">
                府省の政省令などへの意見募集（法案そのものは原則対象外）。
              </span>
            </a>
          </div>
          <div className="srcgroup">
            <div className="gl">人と党</div>
            <a
              className="si"
              href="https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/shiryo/kaiha_m.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">衆議院 会派別所属議員数</span>
              <span className="sd">いまの衆院の勢力。</span>
            </a>
            <a
              className="si"
              href="https://www.sangiin.go.jp/japanese/joho1/kousei/giin/current/giinsu.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sn">参議院 会派別所属議員数</span>
              <span className="sd">いまの参院の勢力。</span>
            </a>
            <Link className="si internal" href="/participate/">
              <span className="sn">意見を伝える経路</span>
              <span className="sd">請願・会派窓口・公聴会など（このサイト内）。</span>
            </Link>
          </div>
        </div>

        <div className="about">
          <h2 className="serif">このサイトについて</h2>
          <p>
            「事実だけを中立に」と掲げても、何を課題として立て、どの対案を載せ、どう要約するか——そこには判断が入ります。完全な中立は達成できません。だからこそ、その判断が入る場所を隠さず書いておきます。
          </p>
          <p>
            <Link href="/about/limits/">→ 方針と、越えられない限界を読む</Link>
          </p>
          <p>
            <Link href="/participate/">
              → 意見を伝えたい場合の「参加の経路」
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
