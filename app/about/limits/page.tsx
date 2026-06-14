import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "このサイトの限界と方針",
  description:
    "法案カルテの編集方針と、構造的に越えられない中立性の限界を先に明示します。",
};

const LIMITS = [
  {
    title: "「課題」「論点」の枠組みの選び方",
    text: "何を課題として立て、どの論点を前面に出すか——その切り分け自体に視点が入ります。私たちは、自前で課題を作るより、国会の審査会で実際に語られた論点をなぞる方を優先しますが、それでも選択は残ります。",
  },
  {
    title: "「対案」としてどの立場を載せるか",
    text: "どの会派・どの主張を取り上げ、どれを省くか。独立した法案として出ていない主張（附則修正の要求や委員会発言）をどう扱うかにも判断が入ります。できるだけ発信元のまま、賛否の重みづけをせずに並べます。",
  },
  {
    title: "「よくある声」の選定（実測ではない）",
    text: "SNSでよく挙がる声を扱うページでは、どの声を載せるかを私たちが選んでいます。「よく挙がる」を測定したわけではありません。選定基準を「審査会で実際に言及された論点＋公開された意見」に寄せて透明化しますが、編集は残ります。",
  },
  {
    title: "「射程外＝心配ない」と読ませない",
    text: "ある懸念が「この法案の射程外」だと書くと、つい「だから問題ない」と読めてしまいます。実際には、未措置の宿題・別制度・制度設計上の論点として残るものがあります。射程の表では、その区別を必ず添えます。",
  },
  {
    title: "要約は原文の劣化コピー",
    text: "分かりやすく言い換えるほど、条文や答弁のニュアンスは落ちます。平易な要約はあくまで入口で、正確さは一次資料が担保します。重要な判断をするときは、必ずリンク先の原典に当たってください。",
  },
];

export default function LimitsPage() {
  return (
    <div className="wrap-sm">
      <header className="mast">
        <div className="wrap">
          <p className="eyebrow">法案カルテ ／ About &amp; Limits</p>
          <h1 className="serif">このサイトの方針と、中立性の限界</h1>
          <p className="sub">
            どの法案ページにも共通する考え方と、私たちが越えられない限界を、先にはっきり書いておきます。
          </p>
        </div>
      </header>

      <main className="wrap">
        <section>
          <div className="shead">
            <span className="num">◇</span>
            <h2 className="serif">何をするサイトか</h2>
          </div>
          <p className="lead">
            重要な法案について、ニュースの論調ではなく、国会・各党・省庁の一次情報だけを材料に、いま何がどう変わろうとしているのかを中立に整理します。読んだ人が自分で判断できる状態にすることが目的で、結論を勧めることはしません。
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
                記述には出典番号を付け、元の一次資料へ直接たどれるようにします。要約は出発点で、原典が正です。
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="shead">
            <span className="num">!</span>
            <h2 className="serif">中立性の限界（いちばん大事なこと）</h2>
          </div>
          <p className="lead">
            「事実だけを中立に」と掲げても、完全な中立は構造的に不可能です。どこに判断が入りうるかを、隠さずに挙げます。読むときの留保にしてください。
          </p>
          {LIMITS.map((l, i) => (
            <div className="lim" key={i}>
              <div className="n">{i + 1}</div>
              <div>
                <h3>{l.title}</h3>
                <p>{l.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section>
          <div className="shead">
            <span className="num">＝</span>
            <h2 className="serif">事実と意見の線引き</h2>
          </div>
          <div className="panel">
            地の文（法案の中身・手続きの状況・現行法の内容）は、検証できる<b>事実</b>
            として書きます。賛否にあたる<b>見解</b>
            は必ず「どの会派・どの主体がそう述べたか」を明示し、私たちの評価を混ぜません。両者が見分けられるよう、意見には発信元のラベルを付けます。
          </div>
        </section>

        <section>
          <div className="shead">
            <span className="num">▤</span>
            <h2 className="serif">出典のポリシー</h2>
          </div>
          <ul className="do">
            <li>
              国会（議案情報・会議録・審査会資料）、各党の公式発信、省庁の資料を一次情報として優先します。
            </li>
            <li>
              報道は原則として材料にしません。速報的な事実（審議入りの合意など）を補助的に使う場合は、その旨を明記し、確定情報は国会の一次資料で確認するよう促します。
            </li>
            <li>
              各記述には出典番号を付け、本文中の番号から元のページへ直接遷移できるようにします。
            </li>
            <li>
              弁護士会声明や論評など立場のある発信を引く場合は、一次情報そのものと区別して扱います。
            </li>
          </ul>
        </section>

        <section>
          <div className="shead">
            <span className="num">−</span>
            <h2 className="serif">やらないこと</h2>
          </div>
          <ul className="donot">
            <li>賛成・反対の推奨や、「こう投票すべき」という誘導はしません。</li>
            <li>法案や政党の採点・スコア化・ランキングはしません。</li>
            <li>
              成立する／しないの勝敗予測はしません（手続きの段取りは事実として示します）。
            </li>
            <li>個別の法的助言はしません。世論調査でもありません。</li>
          </ul>
        </section>

        <section>
          <div className="shead">
            <span className="num">→</span>
            <h2 className="serif">「参加の経路」の扱い</h2>
          </div>
          <p>
            各法案ページには、意見を伝えたい人のために公的な参加経路（請願・会派窓口・公聴会など）を参照として載せることがあります。そこでも賛成・反対のどちらも勧めず、文面の用意や送信件数の表示はしません。ただし、
            <b>
              「情報を得たうえでの参加は正当な選択肢だ」という穏やかな前提
            </b>
            は採っています。これは賛否の推奨とは別物ですが、完全に価値中立ではないため、ここに明記します。意見を伝えないこともまた、同じく正当な選択です。
          </p>
          <p style={{ fontSize: 13.5 }}>
            <Link href="/participate/">→ 参加の経路（共通の仕組み）を見る</Link>
          </p>
        </section>

        <section>
          <div className="shead">
            <span className="num">⟳</span>
            <h2 className="serif">更新と、誤りの扱い</h2>
          </div>
          <p>
            法案は審議の中で修正・継続審議・廃案と動きます。各ページには記載の「時点」を明記し、内容が変わりうることを前提にしています。会期や審議状況などの機械的な数値は毎日自動で更新し、最終更新日時を表示します。誤りが見つかれば訂正し、いつ何を直したかを残す方針です。最新・正確な情報は、必ずリンク先の一次資料で確認してください。
          </p>
        </section>

        <section>
          <div className="shead">
            <span className="num">＠</span>
            <h2 className="serif">運営者と連絡先</h2>
          </div>
          <p>
            個人（<b>（運営ハンドルTBD）</b>
            ）が運営する非営利・無料のサイトです。広告・有料記事・寄付の受付はありません（金銭の授受がないため、特定商取引法に基づく表記の対象外です）。
            <b>
              本サイトは（運営ハンドルTBD）個人の活動であり、運営者が所属する組織・勤務先とは一切関係がありません。
            </b>
          </p>
          <p>
            記述の誤り・出典との不一致は、
            <Link href="/about/corrections/">訂正・連絡の窓口</Link>
            から、該当箇所の引用・一次情報・修正案を添えてご報告ください。確認の結果に応じて、修正・補足・対応見送り（理由つき）を行い、修正と補足は
            <Link href="/about/changelog/">更新履歴</Link>に残します。
          </p>
          <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
            <b>プライバシー：</b>
            このサイトはアクセス解析・Cookie・広告タグを使いません。訂正報告は
            GitHub
            上のフォームで受け付けるため、送信内容と GitHub
            アカウントは GitHub
            社のプライバシーポリシーに従って扱われます。報告に個人情報は含めないでください。
          </p>
        </section>

        <section>
          <div className="shead">
            <span className="num">✦</span>
            <h2 className="serif">それでも残る限界</h2>
          </div>
          <p>
            ここまで対策を挙げましたが、<b>完全な中立は達成できません</b>
            。何を取り上げ、どう要約し、いつの時点で切り取るか——そのすべてに人の判断が入ります。私たちにできるのは、判断が入る場所を隠さず示し、必ず一次資料へ戻れるようにすることだけです。このページ自体が、その限界の宣言です。
          </p>
        </section>

        <p className="back">
          <Link href="/">← トップ（法案一覧）へ戻る</Link>
        </p>
      </main>
    </div>
  );
}
