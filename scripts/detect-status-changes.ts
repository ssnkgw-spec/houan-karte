/**
 * 審議状況の変化検知（GitHub Actions が fetch:dashboard の後・commit の前に実行）。
 * LLM・Anthropic API キーは一切使わない（文字列比較＋JSON書き出し＋gh のみ）。
 *
 * 2つの出力:
 *  ① content/data/pending-refresh.json … 読者向け「進展あり・本文未反映」バナーの単一ソース。
 *     議案DBの審議状況が前回値から変化したカルテを記録し、
 *     人間が本文を反映（bill.statusAsOf を更新）したら自動で消える。
 *  ② karte-refresh ラベルの GitHub Issue … 運営者向けの本文更新タスク（CI かつ GH_TOKEN 時のみ）。
 *
 * 旧値は git HEAD のコミット済み bills-status.json から取得するため、必ず commit 前に走らせる。
 * env: GH_TOKEN（CI で gh を使う場合のみ）
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BillStatusAuto, PendingRefresh } from "../content/schema";
import { bills } from "../content/bills";

const DATA_DIR = join(import.meta.dirname, "..", "content", "data");
const STATUS_PATH = join(DATA_DIR, "bills-status.json");
const PENDING_PATH = join(DATA_DIR, "pending-refresh.json");
const ISSUE_TITLE = "審議状況の変化：本文の更新候補";
const ISSUE_LABEL = "karte-refresh";

function jstTodayYmd(): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** コミット済み（前回）の bills-status.json。初回や取得失敗時は空 */
function readPrevStatus(): BillStatusAuto {
  try {
    const raw = execFileSync("git", ["show", "HEAD:content/data/bills-status.json"], {
      encoding: "utf8",
    });
    return BillStatusAuto.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

function readPending(): PendingRefresh {
  try {
    return PendingRefresh.parse(JSON.parse(readFileSync(PENDING_PATH, "utf8")));
  } catch {
    return {};
  }
}

const ghOut = (args: string[]): string =>
  execFileSync("gh", args, { encoding: "utf8" });
const tryGh = (args: string[]) => {
  try {
    execFileSync("gh", args, { stdio: ["ignore", "inherit", "inherit"] });
  } catch {
    /* ラベル未存在などは無視 */
  }
};

interface Change {
  id: string;
  title: string;
  prev?: string;
  dbStatus: string;
  keikaUrl?: string;
}

function main() {
  const today = jstTodayYmd();
  const next = BillStatusAuto.parse(JSON.parse(readFileSync(STATUS_PATH, "utf8")));
  const prev = readPrevStatus();
  const pending = readPending();

  const billById = new Map(bills.map((b) => [b.id, b]));
  const labelOf = (id: string) =>
    billById.get(id)?.card.title ?? billById.get(id)?.title ?? id;

  // --- 前回値から審議状況が変化したカルテを集める（新規出現は対象外＝過検知を避ける） ---
  const changes: Change[] = [];
  for (const [id, cur] of Object.entries(next)) {
    const before = prev[id]?.status;
    if (before === undefined || before === cur.status) continue;
    changes.push({
      id,
      title: labelOf(id),
      prev: before,
      dbStatus: cur.status,
      keikaUrl: cur.keikaUrl,
    });
  }

  // --- ① pending-refresh.json を更新 ---
  for (const c of changes) {
    pending[c.id] = {
      dbStatus: c.dbStatus,
      prevStatus: c.prev,
      changedAt: today,
      keikaUrl: c.keikaUrl,
    };
  }
  // prune: 人間が本文を反映済み（statusAsOf >= changedAt）／カルテ消滅 の entry を削除
  const pruned: PendingRefresh = {};
  for (const bill of bills) {
    const e = pending[bill.id];
    if (!e) continue;
    if (bill.statusAsOf >= e.changedAt) continue; // 反映済み
    pruned[bill.id] = e;
  }
  writeFileSync(PENDING_PATH, JSON.stringify(pruned, null, 2) + "\n");
  console.log(
    `pending-refresh.json: ${Object.keys(pruned).length} 件が本文未反映`
  );

  if (changes.length === 0) {
    console.log("no status changes");
    return;
  }

  // --- ② 運営者向け Issue（CI かつ GH_TOKEN 時のみ） ---
  const summary = changes
    .map(
      (c) =>
        `- **${c.title}**（${c.id}）: 「${c.prev}」→「${c.dbStatus}」` +
        (c.keikaUrl ? ` ／ [経過情報](${c.keikaUrl})` : "")
    )
    .join("\n");
  console.log(`審議状況の変化 ${changes.length} 件:\n${summary}`);

  if (!process.env.GH_TOKEN) {
    console.log("（GH_TOKEN 未設定のため Issue 通知はスキップ＝ローカルドライ）");
    return;
  }

  const body = [
    "議案DBの審議状況が前回から変化しました。**カルテ本文（s5 採決 / s6 経緯 / 台帳の status・statusAsOf）** を対話セッションで一次資料に当たって更新し、人間ゲート §6-3 を通してください。",
    "",
    summary,
    "",
    "本文を更新して `statusAsOf` を直すと、読者ページの「進展あり・本文未反映」バナーと、このタスクの対象から自動で外れます。",
    `（自動生成: ${today}・LLM不使用）`,
  ].join("\n");

  // タイトル一致で既存の open issue を探す（ラベル未作成でも動くように）
  let existing: number | undefined;
  try {
    const found = JSON.parse(
      ghOut([
        "issue",
        "list",
        "--state",
        "open",
        "--search",
        `${ISSUE_TITLE} in:title`,
        "--json",
        "number,title",
        "--limit",
        "10",
      ])
    ) as Array<{ number: number; title: string }>;
    existing = found.find((i) => i.title === ISSUE_TITLE)?.number;
  } catch {
    existing = undefined;
  }

  if (existing) {
    execFileSync("gh", ["issue", "comment", String(existing), "--body", body], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    console.log(`既存 Issue #${existing} にコメントしました`);
  } else {
    const url = ghOut([
      "issue",
      "create",
      "--title",
      ISSUE_TITLE,
      "--body",
      body,
    ]).trim();
    tryGh(["issue", "edit", url, "--add-label", ISSUE_LABEL]);
    console.log(`Issue を作成しました: ${url}`);
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
