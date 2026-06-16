import { z } from "zod";

/**
 * 法案カルテのコンテンツスキーマ（SERVICE_DESIGN.md §6 の3レーンに対応）
 *
 * 本文テキストのインライン記法（components/RichText.tsx が描画）:
 *   **強調**            … <b>
 *   {1} {1,2}           … 出典参照。sources の id に対応し、ビルド時に一次資料への直リンクになる
 *   [表示名](https://…) … インラインの外部リンク
 *   [表示名](#s3)       … ページ内リンク
 *
 * すべての事実ブロックは lane（L1/L2/L3）を持ち、L2/L3 は本文中の {n} で
 * 出典に束縛される（claim-citation binding）。lint-neutrality.ts が機械検査する。
 */

export const Lane = z.enum(["L1", "L2", "L3"]);
export type Lane = z.infer<typeof Lane>;

/** リッチテキスト1段落ぶん */
const Text = z.string().min(1);

export const SourceRef = z.object({
  id: z.number().int().positive(),
  title: Text, // 例: 衆議院 議案情報（第221回国会 議案一覧・経過）
  url: z.url(),
  note: z.string().optional(), // 例: 「立場のある発信」「報道による（確定は一次資料で）」
});
export type SourceRef = z.infer<typeof SourceRef>;

/* ---------- セクションを構成するブロック（discriminated union） ---------- */

const Paragraph = z.object({
  type: z.literal("paragraph"),
  text: Text,
  lane: Lane.default("L2"),
  /** 出典ページ内の逐語スニペット（30字程度）。下書きレビュー用 */
  snippet: z.string().optional(),
});

/** ①などの沿革タイムライン */
const Timeline = z.object({
  type: z.literal("timeline"),
  items: z.array(
    z.object({
      year: Text, // 例: "2001年" "2026年3月"
      text: Text,
      open: z.boolean().optional(), // 現在進行中の項目
      snippet: z.string().optional(),
    })
  ),
});

/** ②などの課題ボックス */
const Issue = z.object({
  type: z.literal("issue"),
  label: Text, // 例: "課題 A ／ 推進する立場"
  title: z.string().optional(),
  text: Text,
  lane: Lane.default("L3"),
  snippet: z.string().optional(),
});

/** ④などの立場ブロック（発信元ラベル必須・L3） */
const Position = z.object({
  type: z.literal("position"),
  who: Text, // 発信元（会派・主体）。必須＝誤帰属検査の単位
  stance: Text, // 立場の要約句（賛否ラベルではない）
  tone: z.enum(["for", "add"]), // 表示色のみ（for=indigo / add=ochre）。優劣ではない
  text: Text,
  lane: z.literal("L3").default("L3"),
  snippet: z.string().optional(),
});

/** ③の「今→改正後」対比アイテム */
const OldNew = z.object({
  type: z.literal("oldnew"),
  tag: Text, // 例: "変える 01" "新設の柱"
  title: Text,
  scene: z.object({ label: Text, text: Text }).optional(), // 「こういう場面」「ねらい」
  oldLabel: Text.default("今（現行）"),
  oldText: Text,
  oldSnippet: z.string().optional(),
  newLabel: Text.default("改正後"),
  newText: Text,
  newSnippet: z.string().optional(),
  impacts: z
    .array(z.object({ label: Text, text: Text }))
    .max(3)
    .optional(),
});

/** ③の「変える／変えない」二列リスト */
const Ledger = z.object({
  type: z.literal("ledger"),
  change: z.object({ title: Text, items: z.array(Text) }),
  keep: z.object({ title: Text, items: z.array(Text) }),
});

/** 用語ミニ解説 */
const Glossary = z.object({
  type: z.literal("glossary"),
  items: z.array(z.object({ term: Text, desc: Text })),
});

/** ⑧の射程マップ（および③の複数案比較にも使用） */
const ScopeTable = z.object({
  type: z.literal("scope"),
  voiceLabel: Text.default("よく挙がる声"),
  whereLabel: Text.default("どこで扱われるか"),
  rows: z.array(
    z.object({
      topic: Text,
      badge: Text, // 例: "射程内" "射程外" "論点"
      badgeTone: z.enum(["in", "out"]),
      where: Text, // 射程外の行は留保（残る論点）を必ず含める → lint対象
      highlight: z.boolean().optional(),
      snippet: z.string().optional(),
    })
  ),
});

/** ⑤のステッパー */
const Steps = z.object({
  type: z.literal("steps"),
  lead: z.string().optional(),
  items: z.array(z.object({ label: Text, current: z.boolean().optional() })),
});

/** ⑤の会期クロック。日付からの残日数計算はビルド時に行う（L1） */
const SessionClock = z.object({
  type: z.literal("clock"),
  sourceIds: z.array(z.number().int()).optional(),
});

/** 補足の枠（ochre のノート） */
const NoteBox = z.object({
  type: z.literal("notebox"),
  title: Text,
  paragraphs: z.array(Text),
  snippet: z.string().optional(),
});

/** 強調コールアウト（indigo） */
const Callout = z.object({
  type: z.literal("callout"),
  text: Text,
});

/** ⑥の審議ログ */
const Log = z.object({
  type: z.literal("log"),
  items: z.array(
    z.object({
      date: Text,
      badge: Text, // 例: "済" "予定" "これから" "史実"
      tone: z.enum(["done", "next", "plan"]),
      text: Text,
      future: z.boolean().optional(),
      snippet: z.string().optional(),
    })
  ),
});

/** セクション末尾の小さな注記 */
const FootNote = z.object({
  type: z.literal("footnote"),
  text: Text,
});

export const Block = z.discriminatedUnion("type", [
  Paragraph,
  Timeline,
  Issue,
  Position,
  OldNew,
  Ledger,
  Glossary,
  ScopeTable,
  Steps,
  SessionClock,
  NoteBox,
  Callout,
  Log,
  FootNote,
]);
export type Block = z.infer<typeof Block>;

/* ---------- カルテ全体 ---------- */

const Section = z.object({
  title: Text, // 見出し（カルテごとに微調整可。例: "前提となる現行体制"）
  tocLabel: Text, // TOC 表示用の短いラベル
  lead: z.string().optional(),
  blocks: z.array(Block),
});
export type Section = z.infer<typeof Section>;

export const Bill = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: Text, // 正式名称ベースの見出し
  subtitle: Text,
  nickname: z.string().optional(),
  /** 国会回次（第◯回国会）。トップの会期別表示・過去国会アーカイブの紐づけソース */
  session: z.number().int(),

  /** トップのカード表示用 */
  card: z.object({
    badge: Text, // 例: "審議中" "提出済み"
    kind: Text, // 例: "内閣提出・政府"
    title: Text,
    nick: Text,
    desc: Text,
    foot: Text, // 例: "提出：政府（内閣官房）"
  }),

  /** registry card（冒頭の台帳） */
  registry: z.array(z.object({ k: Text, v: Text })),
  /** 台帳内の審議状況（編集判断を含む要約・L2） */
  status: Text,
  /** 「記載時点」(必須・UX必須対応②) */
  statusAsOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** 議案DBとの自動照合に使う完全一致用の議案件名（L1。無ければ照合スキップ） */
  gianTitle: z.string().optional(),

  /** 冒頭の一次資料クイックリンク */
  quickLinks: z.array(z.object({ label: Text, url: z.url() })),
  /** このページの方針（中立性ノート） */
  policyNote: Text,
  /** protobar に出す一言（任意） */
  topNote: z.string().optional(),

  sections: z.object({
    s1: Section, // ① 前提となる現行法・現行体制
    s2: Section, // ② 何が課題とされているか（L3）
    s3: Section, // ③ こう変わる
    s4: Section, // ④ 対案・主な論点（L3）
    s5: Section, // ⑤ 会期と採決
    s6: Section, // ⑥ これまでの経緯
    s7: Section, // ⑦ 設計・方向性の選択（L3）
    s8: Section, // ⑧ よくある声と射程（L3）
  }),

  /** ◇参加（任意）の「この法案に固有の事情」 */
  participation: z.object({ label: Text, text: Text }),
  /** 末尾の読者への一言（任意） */
  closingNote: z.string().optional(),

  /**
   * 施行スケジュール（成立カルテのみ・任意）。
   * 公布日は議案DBにあるが施行日は無いため、e-Gov附則/官報を一次情報に人手入力（L1）。
   */
  enforcement: z
    .object({
      promulgatedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // 公布日
      enforcedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // 施行日（未定なら省略）
      note: z.string().optional(), // 例: "一部は公布後1年以内の政令で定める日"
      sourceIds: z.array(z.number().int()),
    })
    .optional(),

  /**
   * 採決結果（会派別の賛否・事実のみ／POC）。「寄与・貢献」など評価語は持たない。
   * byGroup は本文・出典に名前の挙がった会派の事実列挙。全会派網羅でない場合は note に明記。
   */
  votes: z
    .array(
      z.object({
        house: z.enum(["衆議院", "参議院"]),
        stage: Text, // 例: "本会議" "委員会"
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        total: z.number().int().optional(), // 投票総数
        yea: z.number().int().optional(), // 賛成
        nay: z.number().int().optional(), // 反対
        byGroup: z.array(
          z.object({
            group: Text, // 会派名
            stance: z.enum(["賛成", "反対", "棄権", "欠席", "退席"]),
          })
        ),
        note: z.string().optional(), // 例: "本文記載の主な会派。全会派の投票は出典で確認"
        sourceIds: z.array(z.number().int()),
      })
    )
    .optional(),

  sources: z.array(SourceRef).min(1),
});
export type Bill = z.infer<typeof Bill>;

/* ---------- L1 ダッシュボードデータ（scripts/fetch-dashboard.ts が更新） ---------- */

export const DashboardData = z.object({
  updatedAt: z.string(), // ISO 8601。画面に常時表示（pre-mortemシナリオ2対策）
  /**
   * 会期情報。current = 主役にする国会回次。sessions = 回次ごとの履歴（過去国会アーカイブ用）。
   * 閉会→次国会の切替は sessions に新エントリ追加＋current 更新の人手運用（年数回・低頻度）。
   */
  session: z.object({
    current: z.number().int(),
    sessions: z.array(
      z.object({
        number: z.number().int(),
        type: Text, // 例: "特別会"
        opensOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        note: Text,
        nextOpensOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // 次国会の召集予定日（判明後）
        summary: z.string().optional(), // 閉会後の結果総括（成立/廃案/継続審査）
      })
    ),
  }),
  cabinetBills: z.object({
    submitted: z.number().int(), // 閣法 提出
    passed: z.number().int(), // 閣法 成立
    member: z.object({
      // 議員立法（衆法＋参法）。参法は衆院DBのため衆院到達分のみ＝過小の可能性
      submitted: z.number().int(),
      passed: z.number().int(),
    }),
    lawTotal: z.object({
      // 法律案 合計（閣法＋衆法＋参法）。予算・条約・決算等は含まない
      submitted: z.number().int(),
      passed: z.number().int(),
    }),
    asOf: z.string(),
    sourceUrl: z.url(),
    sourceName: Text,
  }),
  /** 議席（変動時に手動更新。fetch スクリプトは保持する） */
  seats: z.array(
    z.object({
      house: Text,
      total: z.number().int(),
      title: Text,
      caption: Text,
      markers: z.array(z.object({ label: Text, seats: z.number().int() })),
      groups: z.array(
        z.object({ name: Text, seats: z.number().int(), color: Text })
      ),
      footnote: Text,
    })
  ),
});
export type DashboardData = z.infer<typeof DashboardData>;

export const BillStatusAuto = z.record(
  z.string(),
  z.object({
    status: Text, // 議案DB上の審議状況（例: "衆議院で審議中"）
    keikaUrl: z.url().optional(),
    asOf: z.string(),
  })
);
export type BillStatusAuto = z.infer<typeof BillStatusAuto>;

/* ---------- カルテ未反映マーカー（scripts/detect-status-changes.ts が維持） ---------- */
/**
 * 「議案DBの審議状況は進んだが、カルテ本文がまだ追従していない」隙間の機械的マーカー。
 * 読者向けバナー（進展あり・本文未反映）の単一ソース。
 * bill.statusAsOf >= changedAt になった（＝人間が本文を反映した）entry は自動で削除される。
 */
export const PendingRefresh = z.record(
  z.string(),
  z.object({
    dbStatus: Text, // 変化後の議案DB審議状況
    prevStatus: z.string().optional(), // 変化前（初出時はなし）
    changedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // 審議状況が変化した日（JST）
    keikaUrl: z.url().optional(),
  })
);
export type PendingRefresh = z.infer<typeof PendingRefresh>;

/* ---------- 今国会の法律案 全件リスト（scripts/fetch-dashboard.ts が更新） ---------- */
/** /bills/ の内訳。すべて議案DB由来の機械的事実（L1）。法案名は著作権対象外 */
const LedgerBill = z.object({
  no: z.number().int(), // 議案番号
  title: Text, // 議案件名（正式名・著作権対象外）
  status: Text, // 審議状況（例: "成立"）
  kind: z.string().optional(), // 議案種類（議員立法ledgerで "衆法"/"参法" を区別）
  keikaUrl: z.url().optional(), // 衆議院 経過情報
  promulgated: z.string().optional(), // 公布日（成立済みのみ・例: "令和 8年 6月 3日"）
  karteId: z.string().optional(), // カルテがある場合の bill.id（gianTitle 一致で自動付与）
});
const BillsLedger = z.object({
  counts: z.record(z.string(), z.number().int()), // 審議状況ごとの件数
  bills: z.array(LedgerBill),
});
export const CabinetBillsList = z.object({
  asOf: z.string(),
  session: z.number().int(),
  cabinet: BillsLedger, // 閣法（内閣提出法案）
  member: BillsLedger, // 議員立法（衆法＋参法）。参法は衆院到達分のみ
});
export type CabinetBillsList = z.infer<typeof CabinetBillsList>;

/* ---------- 更新履歴（訂正・補足・お知らせ） ---------- */
/** フッターの「更新履歴を残します」の約束を満たす。修正・補足の記録に使う */
export const Changelog = z.array(
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: z.enum(["修正", "補足", "新規", "お知らせ"]),
    billId: z.string().optional(), // 該当カルテ（あればリンク）
    title: Text,
    summary: Text,
    sourceUrl: z.url().optional(), // 根拠の一次情報
    issueUrl: z.url().optional(), // 元になった報告（GitHub Issue）
  })
);
export type Changelog = z.infer<typeof Changelog>;
