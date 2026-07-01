# 法案カルテ — 運用・自動化ガイド

最終更新: 2026-06-30

---

## 自動化の全体像

```
毎日 06:30 JST  GitHub Actions (daily-update.yml)
  → 議案DBから最新データを取得
  → 審議状況の変化を検知して pending-refresh.json を更新
  → main に自動コミット → Vercel が自動再ビルド・デプロイ

毎日 07:15 JST  Claude スケジュールタスク (houan-karte-correction-draft)
  → pending-refresh.json に未処理エントリがあれば起動
  → 修正案を生成して GitHub PR を作成
  → スマホの Claude アプリ（リモートコントロール）で通知
  → 人間が最終HTML（Vercel Preview）を確認してマージ

新規カルテ作成時（随時・手動起動）
  node --import tsx scripts/auto-create-karte.ts <id> work/素材-<id>.md --init
  → 素材ファイルから下書き生成 → 自動バリデーション + Claude による修正を最大5回ループ
  → 全検証通過後に work/preview-<id>.html をブラウザで開く
  → 人間が最終HTML を確認・承認
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
  → npm run fetch:dashboard   # 議案DBからデータ取得
  → npm run lint:neutrality   # 整合性チェック
  → detect-status-changes.ts  # 変化を pending-refresh.json に記録
  → git commit & push         # Vercel 自動デプロイがトリガーされる
```

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
- 素材ファイル（`work/素材-<id>.md`）からの下書き生成
- リンク・出典・構造の自動バリデーションと Claude による自動修正（最大5回ループ）
- 最終 HTML プレビューの生成

**人間のアクション**
1. 一次資料を集めて `work/素材-<id>.md` を作る（スキル `/gather-sources` で半自動化）
2. コマンドを実行:
   ```bash
   node --import tsx scripts/auto-create-karte.ts <bill-id> work/素材-<id>.md --init
   ```
3. ブラウザに開いた `work/preview-<id>.html`（最終HTML）を確認・承認
4. 承認したら `.draft.ts` → `.ts` に確定してコミット:
   ```bash
   mv content/bills/<id>.draft.ts content/bills/<id>.ts
   # content/bills/index.ts に import を追加
   git add content/bills/<id>.ts content/bills/index.ts
   git commit -m "feat: <法案名>のカルテ追加"
   git push origin main
   ```

**バリデーション内容（全通過まで自動ループ）**
| # | チェック |
|---|---------|
| 1 | TypeScript コンパイル |
| 2 | スキーマ・出典参照・中立性リント |
| 3 | sources URL が一次情報ドメイン（go.jp / lg.jp / github.com/smartnews-smri）内 |
| 4 | セクション s1–s8 が全て存在 |
| 5 | s4（主な論点）に position ブロック 2 つ以上 |
| 6 | s5（会期と採決）に log ブロック |
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
