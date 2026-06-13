import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "参加の経路",
  description:
    "国会への請願・各党窓口・公聴会・パブリックコメントなど、法案について意見を伝えたい人のための公的な経路の参照。呼びかけではありません。",
};

export default function ParticipatePage() {
  return (
    <div className="wrap-sm">
      <header className="mast">
        <div className="wrap">
          <p className="eyebrow">法案カルテ ／ Participation</p>
          <h1 className="serif">参加の経路</h1>
          <p className="sub">
            読んだうえで意見を伝えたい人のための、公的な経路の参照です。法案を問わず共通の仕組みをまとめています。
          </p>
        </div>
      </header>

      <main className="wrap">
        <div className="frame">
          <div className="ft">このページの立場</div>
          <ul className="do">
            <li>
              これは<b>呼びかけではなく参照</b>
              です。意見を伝えることを勧めているわけではありません。
            </li>
            <li>
              賛成・反対・保留、<b>どの意見でも経路は同じ</b>です。方向を持ちません。
            </li>
            <li>
              意見を<b>伝えないことも、同じく正当な選択</b>です。
            </li>
            <li>
              ここで示すのは<b>制度的な窓口</b>で、個人を攻撃する手段ではありません。
            </li>
            <li>
              経路があること＝結果が出ること、ではありません。
              <b>効果は保証されません</b>。
            </li>
          </ul>
        </div>

        <section>
          <div className="shead">
            <span className="num alt">A</span>
            <h2 className="serif">請願（せいがん）</h2>
          </div>
          <p className="lead">
            国会に対して意見・要望を正式に届ける、憲法上の権利（憲法16条）。
          </p>
          <div className="ch">
            <span className="tag">CHANNEL A</span>
            <h3>議員の紹介を得て、議院に請願書を提出する</h3>
            <p>
              誰でも提出できますが、国会への請願には<b>紹介議員が必要</b>
              です（国会法79条）。提出された請願は委員会で審査され、採択・不採択が決まります。賛成の請願も反対の請願も、同じ手続きです。
            </p>
            <div className="lim2">
              <b>限界</b>
              　紹介議員を見つける必要があり、採択されるとは限りません。提出が結果に直結するものではありません。
            </div>
            <p className="links">
              手続きの案内：
              <a href="https://www.shugiin.go.jp/" target="_blank" rel="noopener noreferrer">
                衆議院
              </a>
              ／
              <a href="https://www.sangiin.go.jp/" target="_blank" rel="noopener noreferrer">
                参議院
              </a>
            </p>
          </div>
        </section>

        <section>
          <div className="shead">
            <span className="num alt">B</span>
            <h2 className="serif">各党・各議員への意見</h2>
          </div>
          <p className="lead">
            政党・会派や、選挙区の議員に、公式の窓口を通じて意見を伝える。
          </p>
          <div className="ch">
            <span className="tag">CHANNEL B</span>
            <h3>公式の問い合わせ窓口から伝える</h3>
            <p>
              多くの政党・議員は、公式サイトに意見の問い合わせフォームや連絡先を設けています。自分の選挙区の議員に伝えるのが基本的な経路です。どの立場の意見でも同様に受け付けられます。
            </p>
            <div className="lim2">
              <b>限界</b>　返信や反映は保証されません。窓口は
              <b>公式・制度的なものに限り</b>
              、個人への攻撃や私的連絡先の利用は避けてください。
            </div>
          </div>
        </section>

        <section>
          <div className="shead">
            <span className="num alt">C</span>
            <h2 className="serif">公聴会・参考人</h2>
          </div>
          <p className="lead">
            重要な案件で、委員会が一般や専門家から意見を聴く場。
          </p>
          <div className="ch">
            <span className="tag">CHANNEL C</span>
            <h3>公述人の公募に応じて意見を述べる</h3>
            <p>
              重要な案件では、委員会が公聴会を開くことがあります。中央公聴会では、一般から意見を述べる人（公述人）を
              <b>公募</b>
              することがあり、市民が直接意見を述べられる数少ない公式の機会です。日程や公募は各議院・委員会の告知で確認します。
            </p>
            <div className="lim2">
              <b>限界</b>
              　開催されるかは案件次第で、公募の有無・人数も限られます。必ず述べられるわけではありません。
            </div>
            <p className="links">
              告知：
              <a href="https://www.shugiin.go.jp/" target="_blank" rel="noopener noreferrer">
                衆議院
              </a>
              ／
              <a href="https://www.sangiin.go.jp/" target="_blank" rel="noopener noreferrer">
                参議院
              </a>
            </p>
          </div>
        </section>

        <section>
          <div className="shead">
            <span className="num alt">D</span>
            <h2 className="serif">パブリックコメント（意見公募手続）</h2>
          </div>
          <p className="lead">
            行政手続法に基づき、府省が規則を定める際に意見を募る制度。
          </p>
          <div className="ch">
            <span className="tag">CHANNEL D</span>
            <h3>多くの「法案」には、これは使えない</h3>
            <p>
              パブリックコメントは、府省が<b>政令・省令など</b>
              を定める段階で意見を募る制度で、原則として
              <b>
                国会で審議中の法律案そのものや、議員立法には適用されません
              </b>
              。「この法案にパブコメは？」の答えは、しばしば「無い（あったとしても関連する政省令や事前の段階）」になります。この誤解はとても多いので、各カルテで法案ごとに有無を示します。
            </p>
            <p className="links">
              制度・募集中の案件：
              <a
                href="https://public-comment.e-gov.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
              >
                e-Gov パブリック・コメント
              </a>
            </p>
          </div>
        </section>

        <section>
          <div className="shead">
            <span className="num alt">E</span>
            <h2 className="serif">地方議会を通じた意見書（補足）</h2>
          </div>
          <div className="ch">
            <span className="tag">CHANNEL E</span>
            <h3>住民の請願・陳情から、地方議会が国へ意見書を出す</h3>
            <p>
              住民が地方議会に請願・陳情し、地方議会が国に「意見書」を提出する、という間接的な経路もあります。直接ではありませんが、地域からの意思表示の一つの形です。
            </p>
          </div>
        </section>

        <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 18 }}>
          なお、各法案ページに参加経路を載せること自体は、賛否の推奨ではありませんが「情報を得たうえでの参加は正当な選択肢だ」という穏やかな前提を含みます。その扱いは{" "}
          <Link href="/about/limits/">このサイトの限界</Link> に明記しています。
        </p>

        <p className="back">
          <Link href="/">← トップ（法案一覧）へ戻る</Link>
        </p>
      </main>
    </div>
  );
}
