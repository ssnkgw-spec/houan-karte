import dashboard from "@/content/data/dashboard.json";

/**
 * 会期クロック（L1）。残り日数・進捗はビルド時に日付から計算する。
 * GitHub Actions が毎日 dashboard.json を更新コミット → Vercel 再ビルドで常に最新になる。
 */
export type SessionClock = {
  number: number;
  type: string;
  opensOn: string; // YYYY-MM-DD
  endsOn: string;
  note: string;
  todayLabel: string; // 例: "6/12"
  opensLabel: string; // 例: "2026/2/18"
  endsLabel: string;
  remainingDays: number; // 会期末までの残り日数（当日含まず・終了後は0）
  progressPct: number; // 0..100
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function jstToday(): Date {
  const now = new Date(Date.now() + JST_OFFSET_MS);
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function getSessionClock(): SessionClock {
  const s = dashboard.session;
  const open = parseYmd(s.opensOn);
  const end = parseYmd(s.endsOn);
  const today = jstToday();

  const total = (end.getTime() - open.getTime()) / DAY_MS;
  const elapsed = (today.getTime() - open.getTime()) / DAY_MS;
  const progressPct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const remainingDays = Math.max(
    0,
    Math.round((end.getTime() - today.getTime()) / DAY_MS)
  );

  const fmt = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  const fmtFull = (d: Date) =>
    `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`;

  return {
    number: s.number,
    type: s.type,
    opensOn: s.opensOn,
    endsOn: s.endsOn,
    note: s.note,
    todayLabel: fmt(today),
    opensLabel: fmtFull(open),
    endsLabel: fmtFull(end),
    remainingDays,
    progressPct: Math.round(progressPct * 10) / 10,
  };
}

/** "2026-06-10" → "2026年6月10日" */
export function formatYmdJa(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

/** ISO日時 → "2026年6月12日 06:30 JST" */
export function formatDateTimeJa(iso: string): string {
  const d = new Date(new Date(iso).getTime() + JST_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日 ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} JST`;
}
