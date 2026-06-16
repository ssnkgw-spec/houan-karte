import type { Bill } from "@/content/schema";
import Link from "next/link";
import { RichText } from "./RichText";
import { formatYmdJa } from "@/lib/session-clock";

/**
 * 成立法案の施行スケジュール。「成立≠施行」を可視化する。
 * enforcement を持つ法案を施行日昇順（未定は末尾）で並べる。
 */
export function EnforcementSchedule({
  bills,
  linkToKarte = false,
}: {
  bills: Bill[];
  linkToKarte?: boolean;
}) {
  const items = bills
    .filter((b) => b.enforcement)
    .map((b) => ({ bill: b, e: b.enforcement! }))
    .sort((a, b) =>
      (a.e.enforcedOn ?? "9999-99-99").localeCompare(
        b.e.enforcedOn ?? "9999-99-99"
      )
    );
  if (items.length === 0) return null;

  return (
    <div className="enfsched">
      {items.map(({ bill, e }) => (
        <div className="enf" key={bill.id}>
          <div className="enfdates">
            <span className="enfd">
              <span className="el">公布</span>
              {formatYmdJa(e.promulgatedOn)}
            </span>
            <span className="enfarrow" aria-hidden="true">
              →
            </span>
            <span className="enfd">
              <span className="el">施行</span>
              {e.enforcedOn ? (
                formatYmdJa(e.enforcedOn)
              ) : (
                <span className="muted">未確認</span>
              )}
            </span>
          </div>
          <div className="enfmain">
            {linkToKarte ? (
              <Link href={`/bills/${bill.id}/`}>{bill.card.title}</Link>
            ) : (
              <b>{bill.card.title}</b>
            )}
            {e.note && (
              <p className="enfnote">
                <RichText text={e.note} sources={bill.sources} />
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
