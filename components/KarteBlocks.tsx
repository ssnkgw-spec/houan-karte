import type { Block, SourceRef } from "@/content/schema";
import { RichText } from "./RichText";
import { getSessionClock } from "@/lib/session-clock";

/** カルテのセクション本文ブロックを描画する（全て静的・サーバーコンポーネント） */
export function KarteBlock({
  block,
  sources,
}: {
  block: Block;
  sources: SourceRef[];
}) {
  const rt = (text: string) => <RichText text={text} sources={sources} />;

  switch (block.type) {
    case "paragraph":
      return <p>{rt(block.text)}</p>;

    case "timeline":
      return (
        <ul className="tl">
          {block.items.map((it, i) => (
            <li key={i} className={it.open ? "open" : undefined}>
              <span className="yr">{it.year}</span>
              <span className="ev">{rt(it.text)}</span>
            </li>
          ))}
        </ul>
      );

    case "issue":
      return (
        <div className="issue">
          <div className="lab">{block.label}</div>
          {block.title && <h3>{block.title}</h3>}
          <p>{rt(block.text)}</p>
        </div>
      );

    case "position":
      return (
        <div className={`pos ${block.tone}`}>
          <div className="top">
            <span className="who">{block.who}</span>
            <span className="stance">{block.stance}</span>
          </div>
          <div className="body">
            <p>{rt(block.text)}</p>
          </div>
        </div>
      );

    case "oldnew":
      return (
        <div className="item">
          <div className="ihead">
            <span className="itag">{block.tag}</span>
            <h3>{block.title}</h3>
          </div>
          {block.scene && (
            <div className="scene">
              <b>{block.scene.label}</b>　{rt(block.scene.text)}
            </div>
          )}
          <div className="oldnew">
            <div className="on on-old">
              <div className="lab">{block.oldLabel}</div>
              <p>{rt(block.oldText)}</p>
            </div>
            <div className="arrow" aria-hidden="true">
              →
            </div>
            <div className="on on-new">
              <div className="lab">{block.newLabel}</div>
              <p>{rt(block.newText)}</p>
            </div>
          </div>
          {block.impacts && (
            <div className="impact">
              {block.impacts.map((im, i) => (
                <div className="ic" key={i}>
                  <div className="il">{im.label}</div>
                  <div className="iv">{rt(im.text)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "ledger":
      return (
        <div className="ledger">
          <div className="col change">
            <h3>
              <span className="dot" />
              {block.change.title}
            </h3>
            <ul>
              {block.change.items.map((it, i) => (
                <li key={i}>{rt(it)}</li>
              ))}
            </ul>
          </div>
          <div className="col keep">
            <h3>
              <span className="dot" />
              {block.keep.title}
            </h3>
            <ul>
              {block.keep.items.map((it, i) => (
                <li key={i}>{rt(it)}</li>
              ))}
            </ul>
          </div>
        </div>
      );

    case "glossary":
      return (
        <div className="gloss">
          {block.items.map((g, i) => (
            <div className="g" key={i}>
              <div className="gt">{g.term}</div>
              <div className="gd">{rt(g.desc)}</div>
            </div>
          ))}
        </div>
      );

    case "scope":
      return (
        <div className="scope">
          {block.rows.map((row, i) => (
            <div className={`row${row.highlight ? " isin" : ""}`} key={i}>
              <div className="c">
                <span className="lab2">{block.voiceLabel}</span>
                <span className="topic">{rt(row.topic)}</span>
              </div>
              <div className="c mid">
                <span className={`badge2 b-${row.badgeTone}`}>{row.badge}</span>
              </div>
              <div className="c where">
                <span className="lab2">{block.whereLabel}</span>
                {rt(row.where)}
              </div>
            </div>
          ))}
        </div>
      );

    case "steps":
      return (
        <>
          {block.lead && (
            <p className="lead" style={{ marginBottom: 12 }}>
              {rt(block.lead)}
            </p>
          )}
          <div className="steps">
            {block.items.map((st, i) => (
              <div className={`st${st.current ? " cur" : ""}`} key={i}>
                <div className="dot">{i + 1}</div>
                <div className="t">{st.label}</div>
              </div>
            ))}
          </div>
        </>
      );

    case "clock": {
      // L1: 残り日数・進捗はビルド時に計算（毎日の自動再ビルドで鮮度担保）
      const c = getSessionClock();
      const refs = (block.sourceIds ?? [])
        .map((id) => `{${id}}`)
        .join("");
      return (
        <div className="clock">
          <div className="ends">
            <span>
              <b>開会</b> {c.opensLabel}
            </span>
            <span>
              <b>会期末</b> {c.endsLabel}
            </span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${c.progressPct}%` }} />
            <div className="now" style={{ left: `${c.progressPct}%` }} />
            <div className="now-lab" style={{ left: `${c.progressPct}%` }}>
              今 {c.todayLabel}
            </div>
          </div>
          <p className="rem">
            第{c.number}回国会（{c.type}）。会期末まで{" "}
            <b>残り約{c.remainingDays}日</b>。
            {refs && rt(refs)}
            <span className="mono" style={{ fontSize: 11, marginLeft: 8 }}>
              ※ 残り日数は毎日自動更新
            </span>
          </p>
        </div>
      );
    }

    case "notebox":
      return (
        <div className="note-box">
          <h4>{block.title}</h4>
          {block.paragraphs.map((p, i) => (
            <p key={i}>{rt(p)}</p>
          ))}
        </div>
      );

    case "callout":
      return <div className="callout">{rt(block.text)}</div>;

    case "log":
      return (
        <ul className="log">
          {block.items.map((it, i) => (
            <li key={i} className={it.future ? "future" : undefined}>
              <span className="d">{it.date}</span>
              <span className={`badge b-${it.tone}`}>{it.badge}</span>
              <span className="ev">{rt(it.text)}</span>
            </li>
          ))}
        </ul>
      );

    case "footnote":
      return <p className="sectionnote">{rt(block.text)}</p>;
  }
}
