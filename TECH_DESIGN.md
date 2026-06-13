# 技術設計書 — 法案カルテ（Bill Dossier）

> 最終更新: 2026-06-11（初版・`/tech-design` により生成）
> 前提: `SERVICE_DESIGN.md`（特に §6 3レーン）・`UX_DESIGN.md`・`VALIDATION_REPORT.md` を踏まえる。

---

## 0. この設計の方針（標準スタックからの意図的逸脱）

グローバル標準スタック（Next.js + Supabase + Python + Vercel）のうち、**Supabase（DB/Auth）は採用しない**。理由：

- ユーザー登録・UGC・動的データが**一切ない**（読み物の静的サイト）。
- 実行時に外部API/LLMを**呼ばない**（AIは執筆・検証の「ビルド前」工程でのみ使う）。
- → DBを持つと、使い道のない攻撃面・課金面・運用面を抱えるだけ。「無料で作り無料で提供」「課金暴走・漏洩リスクほぼゼロ」と整合する最小構成を採る。

結果として **実行時のシークレットは0個・実行時の外部API呼び出しは0回・サーバー関数も0個**（純静的）にできる。グローバルの「API課金管理10ルール」は、課金面では実質的に対象外になる（唯一の課金面＝ローカルの執筆AIのみ、§8で管理）。

---

## 1. システム全体構成

```
【執筆・検証（ローカル / 手動・随時）】
  一次資料（要綱・会議録・ISSUE BRIEF）
    ↓ 人が読む素材を投入
  AI下書き → AI検証(claim-citation照合) → 中立リント → フラグ出力   ← Anthropic API（ローカルのみ）
    ↓ 人間が最小ゲート（L3のみ・§6-3）
  カルテ構造化データ（TypeScript / content/bills/*.ts）を確定・git commit

【L1データ更新（GitHub Actions / 毎日・自動）】
  NDL会議録API・スマートニュース議案DB(Git)・e-Gov法令API
    ↓ tsx スクリプトで取得・整形
  ダッシュボード/審議状況 JSON（content/data/*.json）を生成
    ↓ 差分があれば自動 commit
  GitHub リポジトリ

【ビルド・配信（Vercel / push 契機で自動）】
  git push / Actions の commit
    ↓ Vercel が next build（output: export = 純静的）
  静的HTML/CSS/JS を CDN 配信
    ↓ HTTPS
  ブラウザ（読者）  ← 実行時のサーバー処理・DB・APIなし
```

ポイント:
- **データ鮮度は「再ビルド」で担保**（DB不要）。毎日 GitHub Actions が L1 データを更新コミット → Vercel が自動再デプロイ。
- **AIの実行（Anthropic API）は読者リクエストの経路に存在しない**。ローカル執筆時のみ。よって実行時のキー流出・課金暴走が構造的に起きない。

---

## 2. 技術スタック（確定）

| レイヤー | 技術 | バージョン | 選定理由 |
|---|---|---|---|
| フレームワーク | Next.js（App Router, `output: export`） | 16.2.x | 静的エクスポートで純静的化。サーバー関数0でVercel課金面ゼロ。将来ISRへ移行も可能 |
| UI | React + 自前CSS（プロトタイプのCSSを踏襲） | React 19.2 | プロトタイプが素のCSSで完成済み。Tailwind等は不要（移植コスト最小）。フォントはGoogle Fonts |
| コンテンツ | TypeScript データファイル（zodで検証） | - | カルテは厳密な8セクション構造＝型付きデータが最適。§6の claim-citation 構造を型で強制できる。MDXより検証・再利用に強い |
| データ取得 | TypeScript スクリプト（`tsx`実行） | Node 22 LTS | NDL/e-GovはHTTP+JSON、議案DBはCSV/JSON。重い数値処理がなく、Next と同一ツールチェーンで完結（Python別環境を持たない）※グローバル標準はPythonだが小規模・単一言語化を優先 |
| 執筆・検証AI | Anthropic API（claude）＋自作CLI | SDK最新 | §6のL2/L3下書き・claim-citation照合・中立リント。**ローカル実行のみ** |
| CI（データ更新） | GitHub Actions（cron） | - | 毎日L1データを取得・自動コミット。public repoなら無料 |
| デプロイ | Vercel Hobby（無料・非商用） | - | 静的配信。100GB転送/月で十分。**非商用限定**（将来寄付導入時はPro要検討） |

---

## 3. データフロー

### 3-1. 収集フロー（L1・自動）
```
GitHub Actions（毎日 06:00 JST 等）
  → scripts/fetch-dashboard.ts
      ├ 内閣法制局/議案DB: 閣法 提出/成立件数
      ├ 衆参 会派別議員数: 議席構成
      ├ 会期情報: 開会/会期末（手動定義 or 取得）
      └ スマートニュース議案DB(raw.githubusercontent): 注目法案の審議状況
  → content/data/dashboard.json / bills-status.json を上書き
  → 差分あれば git commit & push（[skip ci] 付与でループ防止）
  → Vercel が再ビルド・再デプロイ
```

### 3-2. 執筆・検証フロー（L2/L3・手動＝§6の中核）
```
scripts/draft-karte.ts <bill-id>
  1. 素材投入（要綱URL・会議録API結果・ISSUE BRIEF抜粋）
  2. Anthropic API: 各セクションを「text + sourceIds + snippet + lane」付きで下書き
  3. Anthropic API（別呼び出し=敵対的チェッカー）: 各claimをsnippetと含意照合 → 不一致をフラグ
  4. lint-neutrality.ts: 推奨動詞検出 / 立場ブロックの文字数均等 / 射程外行の留保有無 を機械検査
  5. 出力: content/bills/<id>.draft.ts ＋ review-report.md（フラグ一覧）
  ↓
人間ゲート（L3の政治的帰属のみ・4項目チェックリスト §6-3）
  → content/bills/<id>.ts として確定・commit
```

### 3-3. 表示・更新フロー（実行時）
```
ブラウザ → Vercel CDN（静的HTML）  ※これだけ。Server Action も Route Handler も DB も無し
```
- クライアントから `.from()`/`.storage`/`.rpc` を呼ぶ箇所が**存在しない**（DBが無い）。グローバルの「データアクセスはサーバー経由のみ」は自明に満たす。
- 動的処理が要るインタラクション（TOCスクロール等）は表示専用のVanilla JS/Reactのみ。

### 3-4. 更新スケジュール
| 対象 | 頻度 | 手段 |
|---|---|---|
| ダッシュボード数値・審議状況（L1） | 毎日 | GitHub Actions cron → 自動コミット |
| カルテ本文（L2/L3） | 審議の節目ごと（手動） | 変更検知スクリプトがフラグ → 人が更新 |
| 会期・議席など低頻度値 | 変動時 | 手動定義ファイル更新 |

---

## 4. コンテンツデータモデル（DBの代わり）

DBが無いため、型付きTypeScriptデータファイルで表現する。`content/` 配下に置き、zodでビルド時検証。

```ts
// content/schema.ts
type Lane = 'L1' | 'L2' | 'L3';

type SourceRef = { id: number; title: string; url: string };

// §6: 全ての事実文は出典と引用スニペットを持つ（検証パイプラインの単位）
type Claim = {
  text: string;
  sourceIds: number[];      // 本文の上付き [n] に対応
  snippet?: string;         // 一次資料からの引用（L2/L3の照合用）
  lane: Lane;
  verified?: boolean;       // 検証/人間ゲートの結果
};

type Position = {           // ④各党の立場（発信元ラベル付き・極力逐語引用）
  who: string;              // 例: "国民民主党" "政府(提出者)"
  stance: string;           // ラベル（賛否でなく立場の要約句）
  quote: Claim;             // できるだけ会議録の逐語（著作権法40条で自由利用可）
};

type Bill = {
  id: string;               // スラッグ（例: "bousai"）
  title: string;
  nickname?: string;
  session: number;          // 国会回次
  kind: string;             // 内閣提出/議員立法 等
  status: string;           // 審議状況（L1で自動更新されうる）
  statusAsOf: string;       // 「記載時点」(必須)
  sources: SourceRef[];
  sections: {
    current: Claim[];       // ① 現行法・現行体制
    issues: Claim[];        // ② 課題（L3）
    changes: ChangeItem[];  // ③ 現行↔改正後
    positions: Position[];  // ④ 立場（L3）
    schedule: ScheduleStep[]; // ⑤ 会期・採決（L1由来）
    history: TimelineEvent[]; // ⑥ 経緯（L1由来）
    designChoice: Claim[];  // ⑦（L3）
    scope: ScopeRow[];      // ⑧ 射程（L3・各行に留保必須）
  };
};

type DashboardData = {      // content/data/dashboard.json（L1・自動生成）
  session: { number: number; type: string; opensOn: string; endsOn: string };
  cabinetBills: { submitted: number; passed: number; asOf: string };
  seats: { house: 'shugiin' | 'sangiin'; total: number;
           groups: { name: string; seats: number; color: string }[] }[];
  updatedAt: string;        // 画面に常時表示（pre-mortemシナリオ2対策）
};
```

設計意図:
- `Claim` を最小単位にすることで、§6の「主張＝出典の束縛」「検証パイプライン」「中立リント」がすべて**型と機械処理で回せる**。
- `statusAsOf` / `updatedAt` を**必須**にして「記載時点」表示を強制（UX_DESIGN.md 必須対応②）。

---

## 5. 「API設計」＝ビルド時スクリプト（実行時APIは無し）

実行時のRoute Handler / Server Action は**作らない**（動的データが無いため）。代わりにビルド前スクリプトを定義。

| スクリプト | 役割 | 実行 |
|---|---|---|
| `scripts/fetch-dashboard.ts` | NDL/議案DB/e-Govから L1 データ取得→JSON生成 | GitHub Actions（毎日） |
| `scripts/fetch-status.ts` | 注目法案の審議状況を議案DBから更新 | GitHub Actions（毎日） |
| `scripts/draft-karte.ts` | AI下書き＋検証＋リント→draft出力 | ローカル手動 |
| `scripts/lint-neutrality.ts` | 中立リント（CIでも実行可・PRチェック化） | ローカル/CI |
| `scripts/detect-changes.ts` | 既存カルテと一次情報の差分検知→要更新フラグ | GitHub Actions（毎日） |

セキュリティ前提（グローバル準拠）:
- 実行時シークレット**なし**。`NEXT_PUBLIC_*` に秘密を入れる箇所が**存在しない**。
- `ANTHROPIC_API_KEY` は**ローカルの執筆時のみ**。Vercel にも GitHub Actions にも**置かない**（毎日のL1更新はLLMを使わないため不要）。
- kill switch（`SERVICE_ENABLED=false`→503）は、実行時にLLM/DBを呼ばないため**実行時には不要**。執筆AIの暴走防止は §8 のAnthropic側上限で担保。

---

## 6. 外部 API 仕様（確認済み）

### NDL 国会会議録検索API
- ベース: `https://kokkai.ndl.go.jp/api/`、エンドポイント: `speech` / `meeting` / `meeting_list`
- 形式: `recordPacking=json`、認証**不要・無料**
- 主パラメータ: `any`(AND), `nameOfMeeting`(OR), `nameOfHouse`, `speaker`, `from`/`until`(YYYY-MM-DD), `sessionFrom`/`sessionTo`, `startRecord`
- 上限: 1回 **最大100件**（meetingは10件）、ページングは `nextRecordPosition`
- 注意: 「短時間の大量アクセスを避け、取得ごとに数秒空ける」→ スクリプトに **sleep（3秒程度）** を実装
- 利用規約: NDLコンテンツ利用規約。議員発言は著作権法40条で自由利用可（§9参照）

### e-Gov 法令API Version 2
- ベース: `https://laws.e-gov.go.jp/api/2`、JSON、2025-03-19リリース
- 主エンドポイント: `/laws`（法令検索）, `/law_data/{id}`（本文取得）、特定時点の条文取得対応
- 仕様: Swagger UI `https://laws.e-gov.go.jp/api/2/swagger-ui`（実装時に再確認）

### スマートニュース 国会議案データベース
- 取得: GitHub `smartnews-smri/house-of-representatives`（参院は別repo）の raw CSV/JSON
- ライセンス: **MIT**（商用可・要著作権表記）、**bot が毎日更新**（現行国会カバー）
- 主カラム: 種類/審議状況/経過情報/本文情報/提出賛成者 等

### 衆参 議案情報（補助・スクレイピング）
- robots.txt によるクロール禁止**なし**（両サイト404）。低頻度・負荷配慮で利用。議案DBで足りない最新経過の補完用。

---

## 7. ディレクトリ構成

```
houan-karte/
├ app/                       # Next.js App Router
│  ├ layout.tsx              # 共通レイアウト（★グローバルヘッダー: UX必須対応①）
│  ├ page.tsx                # トップ＝ダッシュボード
│  ├ bills/[id]/page.tsx     # 法案カルテ（generateStaticParams で全件SSG）
│  ├ about/limits/page.tsx   # 方針と限界（genkai）
│  └ participate/page.tsx    # 参加の経路（sanka）
├ components/                # KarteSection, OldNewCompare, Positions, Dashboard, Sources 等
├ content/
│  ├ schema.ts               # zod スキーマ（§4）
│  ├ bills/<id>.ts           # カルテ確定データ（人間ゲート通過後）
│  └ data/dashboard.json     # L1自動生成
├ scripts/                   # §5 のスクリプト群
│  ├ fetch-dashboard.ts
│  ├ draft-karte.ts
│  ├ lint-neutrality.ts
│  └ detect-changes.ts
├ styles/                    # プロトタイプCSSを移植
├ .github/workflows/
│  └ daily-update.yml        # 毎日 L1 更新＋自動コミット
├ next.config.ts             # output: 'export'
└ package.json
```

移植の出発点: `files/` の7HTMLを `app/` + `components/` + `styles/` に分解。CSSはほぼそのまま流用。

---

## 8. 環境変数

| 変数名 | 用途 | scope | 取得先 |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | 執筆・検証AI（§3-2） | **ローカルのみ**（`.env.local`／Vercel・GitHubには置かない） | Anthropic Console |

- 実行時（Vercel配信）に必要な環境変数は**0個**。
- GitHub Actions の自動コミットは標準の `GITHUB_TOKEN`（自動付与）で足り、追加シークレット不要。
- **課金管理（執筆AIのみが対象）**: Anthropic Console で Spending Limit ＋ 3段階アラート（50/80/95%）＋ auto-reload OFF を設定。実行時の課金面は存在しない。

---

## 9. 開発環境のセットアップ手順

1. `npx create-next-app@latest houan-karte --ts --app`（既存ディレクトリに合わせて初期化）/ `output: 'export'` を `next.config.ts` に設定
2. `files/` の HTML/CSS を `app/`・`components/`・`styles/` へ移植（まずトップ＋カルテ1本）
3. `content/schema.ts`（zod）と `content/bills/bousai.ts` を1本作り、コンポーネントでレンダリング
4. `scripts/fetch-dashboard.ts` を実装 → `content/data/dashboard.json` 生成（NDL API は sleep 3秒）
5. `.github/workflows/daily-update.yml` を作成（cron＋自動コミット）
6. ローカルで `scripts/draft-karte.ts` を実装し、§6フローでカルテ1本を作って**制作時間を実測**（VALIDATION_REPORTの最重要アクション）
7. Vercel に接続（Hobby）。`ANTHROPIC_API_KEY` は登録しない。プレビューで動線確認 → 本番公開

---

## 10. 要確認・未決（実装時）

- e-Gov法令API v2 の具体スキーマ（`/law_data` のレスポンス構造）は Swagger で実装時確認。
- スマートニュース議案DBのカラム名の正確な対応（実ファイルを見て確定）。
- 会期情報（開会/会期末）の自動取得元。難しければ手動定義ファイルで運用。
- 「変更検知→要更新フラグ」の精度（誤検知が多いと運用負荷増）。MVPは手動更新でも可。
- 将来、寄付を導入する場合は Vercel **非商用条件**に抵触しうる → Pro 移行＋外部決済（Stripe等は別途）を検討。

---

## 更新履歴

- 2026-06-11: 初版作成（`/tech-design` により生成）。静的サイト・DBなし構成を確定。API仕様（NDL/e-Gov/議案DB）・Next.js 16.2/Vercel Hobby を実確認のうえ反映。
