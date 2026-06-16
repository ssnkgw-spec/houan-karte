import type { Bill, SourceRef } from "@/content/schema";
import { RichText } from "./RichText";

/**
 * 採決結果の可視化（POC）。会派別の賛否を「事実」として並べるだけで、
 * 寄与・貢献・優劣の評価はしない。色（indigo/slate）は賛成・反対の区別であって価値判断ではない。
 */
export function VotesPanel({
  votes,
  sources,
}: {
  votes: NonNullable<Bill["votes"]>;
  sources: SourceRef[];
}) {
  return (
    <div className="votespanel">
      {votes.map((v, i) => {
        const yea = v.byGroup.filter((g) => g.stance === "賛成");
        const nay = v.byGroup.filter((g) => g.stance === "反対");
        const other = v.byGroup.filter(
          (g) => g.stance !== "賛成" && g.stance !== "反対"
        );
        const denom = (v.yea ?? 0) + (v.nay ?? 0);
        const yeaPct = denom > 0 ? ((v.yea ?? 0) / denom) * 100 : 50;
        return (
          <div className="vote" key={i}>
            <div className="vhead">
              <span className="vwhere">
                {v.house}・{v.stage}
              </span>
              <span className="vdate mono">{v.date}</span>
            </div>

            {(v.yea != null || v.nay != null) && (
              <>
                <div className="vbar">
                  <i className="y" style={{ width: `${yeaPct}%` }} />
                  <i className="n" style={{ width: `${100 - yeaPct}%` }} />
                </div>
                <div className="vlegend">
                  <span>
                    <span className="sw y" /> 賛成 <b>{v.yea}</b>
                  </span>
                  <span>
                    <span className="sw n" /> 反対 <b>{v.nay}</b>
                  </span>
                  {v.total != null && (
                    <span className="vtot">投票総数 {v.total}</span>
                  )}
                </div>
              </>
            )}

            <div className="vgroups">
              <div className="vcol">
                <div className="vcl">賛成した会派</div>
                <div className="vchips">
                  {yea.map((g) => (
                    <span key={g.group} className="vchip y">
                      {g.group}
                    </span>
                  ))}
                </div>
              </div>
              <div className="vcol">
                <div className="vcl">反対した会派</div>
                <div className="vchips">
                  {nay.map((g) => (
                    <span key={g.group} className="vchip n">
                      {g.group}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {other.length > 0 && (
              <p className="vother">
                {other.map((g) => `${g.group}（${g.stance}）`).join("・")}
              </p>
            )}

            {v.note && <p className="vnote">{v.note}</p>}

            <p className="vsrc">
              出典：
              {v.sourceIds.map((id, k) => (
                <span key={id}>
                  {k > 0 && "・"}
                  <RichText text={`{${id}}`} sources={sources} />
                </span>
              ))}
            </p>
          </div>
        );
      })}
    </div>
  );
}
