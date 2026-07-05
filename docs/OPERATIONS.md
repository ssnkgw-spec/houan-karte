# 法案カルテ — 運用・自動化ガイド

最終更新: 2026-07-06

---

## 自動化の全体像

```
毎日 06:30 JST  GitHub Actions (daily-update.yml)
  → 議案DBから最新データを取得（会期切替＝新しい掲載回次も検知して Issue 起票）
  → 中立リント + 静的ビルド検証（壊れたデータを main に入れない）
  → 審議状況の変化を検知して pending-refresh.json を更新・karte-refresh Issue に通知
  → 月曜のみ: カルテ未作成×審議が動いた法案を「カルテ候補（週次）」Issue に列挙
  → main に自動コミット → Vercel が自動再ビルド・デプロイ

毎日 07:15 JST  Claude スケジュールタスク (houan-karte-correction-draft)
  → pending-refresh.json に未処理エントリがあれば起動
  → 修正案を生成して GitHub PR を作成（変更サマリー表＋人間ゲート4項目つき）
  → スマホの Claude アプリ（リモートコントロール）で通知
  → 人間が最終HTML（Vercel Preview）を確認してマージ
  ※ 手順の単一の真実は docs/correction-routine.md

新規カルテ作成時（随時・Claude セッションで起動）
  /gather-sources <法案名>  → work/素材-<id>.md を生成（Phase A）
  /create-karte <bill-id>   → セッション内で下書き生成 → サブエージェントの敵対的チェック
                              → 自動バリデーション＋修正を最大5回ループ（Phase B）
  → 人間が work/review-report-<id>.md と work/preview-<id>.html を確認・「承認」
  → .ts 確定・index.ts 登録・commit・push まで自動実行
```

---

## ① L1データ・サイト統計の自動更新

**何が自動化されているか**
- 可決法案数・審議状況・会期クロック（残り日数）などの統計データ
- `content/data/` 以下の JSON ファイル（dashboard.json / bills-status.json 等）

**人間のアクション: 不要**
GitHub Actions が毎朝取得・コミット → Vercel が自動でサイトに反映される。

**仕組み**
```
daily-update.yml (06:30 JST)
  → npm run fetch:dashboard          # 議案DBからデータ取得（最大の掲載回次も記録）
  → npm run lint:neutrality          # 整合性チェック
  → npm run build                    # ビルド検証（データ起因の破壊をコミット前に検知）
  → detect-status-changes.ts         # 変化を pending-refresh.json に記録・会期切替も検知
  → propose-karte-candidates.ts      # 月曜のみ: カルテ候補（週次）Issue を起票
  → git commit & push                # Vercel 自動デプロイがトリガーされる
```

**会期切替の検知（半自動）**
議案DBに現在の回次（`dashboard.json` の `session.current`）より新しい掲載回次が出現すると、Issue「新しい国会回次を検知: 第N回」が自動で立つ。dashboard.json の `sessions[]` 追加・旧会期の `summary` 追記・`current` 更新は Issue 記載の手順に従って人手で行う（年数回・低頻度）。

**カルテ候補の週次提案**
毎週月曜、約7日前のコミットと比較して「カルテ未作成 × 審議状況が変化」した法案を Issue「カルテ候補（週次）」に列挙する（LLM不使用）。週2本ペースの候補選定に使う。

---

## ② 審議進展の反映（「進展あり・反映待ち」タグ）

**何が自動化されているか**
- 議案DBで審議状況が変化したカルテの検知
- 修正案（status・審議ログ）のドラフト生成と GitHub PR 作成

**人間のアクション**
1. 07:15 ごろにスマホの Claude アプリへ通知が来る
2. Vercel Preview URL（最終HTML）を確認
3. 問題なければ「マージ」と返答 → 自動でマージ → Vercel 本番反映
4. 内容を直したければ GitHub でファイルを編集してからマージ

**仕組み**
```
スケジュールタスク (07:15 JST)
  → pending-refresh.json を確認
  → 未処理エントリがなければ終了（通知なし）
  → あれば: keikaUrl をフェッチ → status / statusAsOf / s5 log を更新
  → tsc + lint:neutrality で検証
  → draft/correction-YYYYMMDD-{id} ブランチに PR を作成
  → ユーザーに修正サマリーと Vercel Preview URL を提示
```

手順の詳細: [`docs/correction-routine.md`](correction-routine.md)

---

## ③ 新規カルテの作成

**何が自動化されているか**
- 素材ファイル（`work/素材-<id>.md`）からの下書き生成（セッション内の Claude が直接生成・`claude -p` 不使用）
- サブエージェントによる敵対的チェック（素材との逐語照合 → `work/review-report-<id>.md`）
- リンク・出典・構造の自動バリデーションと直接修正（最大5回ループ）
- 最終 HTML プレビューの生成
- 承認後の `.draft.ts` 確定・index.ts 更新・git commit & push

**人間のアクション**
1. `/gather-sources` を実行 → `work/素材-<id>.md` を生成
2. `/create-karte <bill-id>` を実行 → バリデーション＋修正ループが Claude のチャット上で進む
3. 「`work/preview-<id>.html` を確認してください」のメッセージが来たらブラウザで確認
4. チャットで「承認」と返信 → `.ts` 確定・index.ts 更新・git push まで自動実行

**バリデーション内容（全通過まで自動ループ）**
| # | チェック |
|---|---------|
| 1 | TypeScript コンパイル |
| 2 | スキーマ・出典参照・中立性リント |
| 3 | sources URL が一次情報ドメイン（go.jp / lg.jp / github.com/smartnews-smri）内 |
| 4 | セクション s1–s8 が全て存在 |
| 5 | s4（主な論点）に position ブロック 2 つ以上 |
| 6 | s6（これまでの経緯）に log ブロック |
| 7 | s8（よくある声と射程）に scope ブロック |
| 8 | HTML アンカー #s1–#s8・#sources が全て存在 |

品質基準: `content/bills/kojin-joho.ts`（個人情報保護法等改正案）と同等の構造

---

## フォルダ構成

```
houan-karte/
├── app/             # Next.js ページ
├── components/      # UI コンポーネント
├── content/
│   ├── bills/       # 法案データ（*.ts）/ 下書き（*.draft.ts は gitignore 済み）
│   ├── data/        # 自動更新 JSON（dashboard / bills-status / pending-refresh）
│   └── schema.ts    # Bill 型スキーマ（Zod）
├── docs/            # 設計・運用ドキュメント
│   ├── legacy/      # 旧 HTML（参照用アーカイブ）
│   ├── OPERATIONS.md（このファイル）
│   └── correction-routine.md
├── lib/             # ユーティリティ
├── scripts/         # 執筆・自動化スクリプト
├── styles/          # グローバル CSS
├── public/          # 静的ファイル
└── work/            # 作業ディレクトリ（gitignore 済み）
    ├── 素材-*.md    # 収集した一次資料
    ├── preview-*.html  # 生成HTMLプレビュー
    └── review-report-*.md  # 下書き検証レポート
```

---

## トラブルシュート

| 症状 | 確認場所 | 対応 |
|------|---------|------|
| サイトの統計が古い | GitHub Actions の daily-update ログ | 手動で `workflow_dispatch` を実行 |
| 「進展あり」バナーが消えない | `content/data/pending-refresh.json` | ② のスケジュールタスクを手動実行 |
| 新規カルテが 5 回ループで失敗 | 素材ファイルの内容・出典URL | 素材を補足してから `--init` なしで再実行 |
| Vercel デプロイが失敗 | Vercel ダッシュボード | `npm run build` をローカルで実行して原因を特定 |
