# 法案カルテ（Bill Dossier）

重要な国会法案を、報道の論調ではなく一次情報（議案情報・会議録・省庁資料）だけを材料に、固定テンプレート（8セクション）で中立に整理する静的サイト。結論は出さず、判断は読者に委ねる。

- 設計書: `SERVICE_DESIGN.md` / `UX_DESIGN.md` / `TECH_DESIGN.md` / `VALIDATION_REPORT.md`
- プロトタイプ原本: `files/`（HTML 7枚。本実装の出発点）

## アーキテクチャ

```
読者 ← Vercel CDN（純静的HTML） ← next build (output: export)
                                      ↑ git push で自動再ビルド
GitHub Actions（毎日 06:30 JST）
  ├ scripts/fetch-dashboard.ts
  │   スマートニュース議案DB(MIT) → 法律案の成立数（閣法/衆法/参法）・各法案の審議状況・全件リストを取得
  │   → content/data/*.json を自動コミット → Vercel 再ビルド
  │   → 会期クロック（残り日数）もビルド時計算で同時に最新化
  └ scripts/detect-status-changes.ts（LLM不使用）
      審議状況が前回値から変化したカルテを検知
      → pending-refresh.json を更新（＝読者ページに「進展あり・本文未反映」バナー）
      → karte-refresh ラベルの Issue を起票/更新（＝運営者の本文更新タスク）
```

- **DB・認証・サーバー関数・実行時シークレット: すべてゼロ**。実行時に外部APIを呼ばない
- **フォントは @fontsource でセルフホスト**（ビルド時・実行時とも外部リクエストなし）
- **セキュリティヘッダーは `vercel.json`**（CSP / HSTS / nosniff / frame-ancestors 等）

## コンテンツの3レーン（SERVICE_DESIGN.md §6）

| レーン | 中身 | 担い手 |
|---|---|---|
| L1 機械的事実 | 会期残日数・成立件数・審議状況 | GitHub Actions が毎日自動更新（人を外す） |
| L2 事実散文 | 現行法・「こう変わる」など | AI下書き＋AI検証＋中立リント。フラグのみ人間 |
| L3 政治的帰属 | 課題の立て方・各党の立場・射程 | 新規公開時のみ人間が4項目チェック（§6-3） |

- カルテ本文 = 型付きデータ `content/bills/<id>.ts`（zod スキーマ `content/schema.ts`）
- 全事実文は本文中の `{n}` で出典に束縛され、ビルド時に一次資料への直リンクになる
- `scripts/lint-neutrality.ts` が出典整合・誘導表現・立場の等量などを機械検査（ビルド前に必ず実行される。ERROR があるとビルド失敗）

## 自動更新の範囲（どこまで機械・どこから人間か）

毎日の Actions が触るのは**機械的事実だけ**。カルテ本文の散文は書いた時点で固定される。

| 区分 | 対象 | 担い手 |
|---|---|---|
| 毎日自動 | 審議状況バッジ（`bills-status.json`）／成立件数（`dashboard.json`）／全件リスト（`cabinet-bills.json`）／会期クロック・`updatedAt`／未反映マーカー（`pending-refresh.json`） | GitHub Actions（LLM不使用） |
| 固定（要・人間更新） | 本文8セクション散文（s5 採決・s6 経緯を含む）／台帳の手書き要約 `status`・`statusAsOf` | 人間ゲート §6-3 |

**隙間の扱い**：議案DBの審議状況が変わった日は、`detect-status-changes.ts` が ①該当カルテに「進展あり・本文未反映」バナーを自動表示（読者向けの正直表示）し、②`karte-refresh` Issue を起票（運営者向けタスク）する。人間が本文を更新して `statusAsOf` を直すと、バナー・Issue 対象から自動で外れる（`statusAsOf >= 変化日` を各ページで再評価する二重防御）。本文散文は L3＝人間ゲート必須のため、CI で自動書き換えはしない。

## コマンド

```bash
npm run dev              # 開発サーバー
npm run build            # 中立リント → 静的ビルド（out/）
npm run typecheck        # 型チェック
npm run lint:neutrality  # 中立リント単体
npm run fetch:dashboard  # L1データ手動取得（GIAN_JSON_PATH=path でローカルファイル入力可）

# 執筆・審査AI（claude -p＝Claude Code CLI のサブスク課金で動く・Anthropic API キー不要）
node --import tsx scripts/draft-karte.ts <bill-id> 素材.md   # カルテ下書き＋検証レポート

# 訂正報告のローカル一括審査（要 gh ログイン）
npm run triage:corrections           # ドライラン（triage-report.md 出力）
npm run triage:corrections -- --apply  # 却下・対応見送りにコメント＋クローズ
```

## 訂正・連絡の窓口（信頼まわり）

誤りの報告は **GitHub Issue Form**（`.github/ISSUE_TEMPLATE/correction.yml`）で受け付ける。サイト側は静的のまま・CSP変更なし・実行時APIキーなし。

- 投稿は **①カルテ本文の引用／②一次情報のURL＋原文引用／③修正案** が必須（GitHub が入力強制）
- `correction-precheck.yml`（Action・**AI不使用/シークレット不要**）が、②URLドメイン・①引用のカルテ本文への実在・各欄の有無を自動判定し、NGは `format-invalid` ＋コメント、OKは `needs-review`
- `scripts/triage-corrections.ts`（**ローカル**）が通過分をAI審査し、推奨対応（修正／補足／対応しない）を `triage-report.md` に出力。運営者はこれだけ読む
- ②の許可ドメインは `lib/primary-sources.ts` で一元管理（go.jp / lg.jp / github.com/smartnews-smri）
- 確定した修正・補足は `content/data/changelog.json` に追記し `/about/changelog/` に表示
- security.txt は `public/.well-known/security.txt`

### 初回セットアップ（一度だけ）

ラベルがリポジトリに存在しないと Issue Form のラベル付与と Action のトリガーが効かない。`gh` で作成しておく：

```bash
gh label create correction     -c "#5319e7" -d "訂正報告（フォーム経由）"
gh label create needs-review    -c "#0e8a16" -d "自動チェック通過・要確認"
gh label create format-invalid  -c "#b60205" -d "①②不備・自動で差し戻し"
gh label create karte-refresh   -c "#8f6310" -d "審議状況が変化・本文の更新候補"
```

また `app/about/limits/page.tsx` 内の `（運営者ハンドル）`（2か所）を実際のハンドル名に置換すること。

## カルテを1本追加する手順

一次資料の収集（Phase A）から下書き（B）・人間ゲート（C）までを分けて回す。A と B は `claude -p`（サブスク課金・APIキー不要）。

**Phase A 収集** — 対話セッションで Claude に集めさせる（人間が検索するより速い）
- `/gather-sources <法案名 or bill-id>`（または「一次資料を集めて」と依頼）。`.claude/skills/gather-sources/SKILL.md` の手順で、Claude が **WebSearch/WebFetch を `lib/primary-sources.ts` の許可ドメインに限定**して収集し、8セクションに割り付けた `素材-<id>.md`（git 管理外）を生成する。報道・政党サイトは素材にしない。

**Phase B 下書き**
- `node --import tsx scripts/draft-karte.ts <id> 素材-<id>.md` で下書き `content/bills/<id>.draft.ts` と検証レポート `review-report-<id>.md` を生成（または `content/bills/bousai.ts` を雛形に手書き）。

**Phase C 人間ゲート（§6-3）と確定**
1. `review-report-<id>.md` 末尾の4項目チェックを人が通す
2. `content/bills/<id>.ts` として確定し、`content/bills/index.ts` に登録
3. 議案DBで自動追跡する場合は `gianTitle` に正式な議案件名（完全一致）を設定
4. `npm run build` が通れば公開可能

## デプロイ（初回）

1. `git init && git add -A && git commit` → GitHub に public リポジトリを作成して push
2. GitHub: Settings → Actions → General → Workflow permissions を **Read and write** に（daily-update の自動コミットに必要）
3. Vercel: リポジトリを Import（Hobby・環境変数の登録は不要）
4. 公開前に `/security-audit` を実行し、公開直後24時間は Deployment Protection を検討
5. ドメイン確定後、`NEXT_PUBLIC_SITE_URL` を Vercel の環境変数に設定（秘密情報ではない）

## セキュリティ・運用メモ

- 執筆（draft-karte）・審査（triage）・収集（gather-sources）は **`claude -p`＝Claude Code CLI のサブスク課金**で動く。**Anthropic API キーは不要**（コードからキー依存を排除済み）。Actions も議案DB取得と状況変化検知だけで LLM を使わない
- Vercel Hobby は非商用限定。将来寄付等を入れる場合は Pro 移行を検討
- スマートニュース議案DBは MIT ライセンス（出典表記をトップとカルテの出典欄で明示済み）
- 数値が古いまま放置される事故（pre-mortem シナリオ2）への対策として、最終更新日時をトップに常時表示。Actions の失敗は GitHub から通知される
