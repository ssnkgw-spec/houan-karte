# 法案カルテ（Bill Dossier）

重要な国会法案を、報道の論調ではなく一次情報（議案情報・会議録・省庁資料）だけを材料に、固定テンプレート（8セクション）で中立に整理する静的サイト。結論は出さず、判断は読者に委ねる。

- 設計書: `SERVICE_DESIGN.md` / `UX_DESIGN.md` / `TECH_DESIGN.md` / `VALIDATION_REPORT.md`
- プロトタイプ原本: `files/`（HTML 7枚。本実装の出発点）

## アーキテクチャ

```
読者 ← Vercel CDN（純静的HTML） ← next build (output: export)
                                      ↑ git push で自動再ビルド
GitHub Actions（毎日 06:30 JST）
  └ scripts/fetch-dashboard.ts
      スマートニュース議案DB(MIT) → 法律案の成立数（閣法/衆法/参法）・各法案の審議状況・全件リストを取得
      → content/data/*.json を自動コミット → Vercel 再ビルド
      → 会期クロック（残り日数）もビルド時計算で同時に最新化
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

## コマンド

```bash
npm run dev              # 開発サーバー
npm run build            # 中立リント → 静的ビルド（out/）
npm run typecheck        # 型チェック
npm run lint:neutrality  # 中立リント単体
npm run fetch:dashboard  # L1データ手動取得（GIAN_JSON_PATH=path でローカルファイル入力可）

# 執筆AI（ローカル専用・APIキーをVercel/GitHubに置かないこと）
ANTHROPIC_API_KEY=sk-... node --import tsx scripts/draft-karte.ts <bill-id> 素材.md
```

## カルテを1本追加する手順

1. 一次資料（要綱・会議録・ISSUE BRIEF）を集めて素材テキストにまとめる
2. `scripts/draft-karte.ts` で下書き＋検証レポートを生成（または `content/bills/bousai.ts` を雛形に手書き）
3. 人間ゲート: `review-report-<id>.md` 末尾の4項目チェック
4. `content/bills/<id>.ts` として確定し、`content/bills/index.ts` に登録
5. 議案DBで自動追跡する場合は `gianTitle` に正式な議案件名（完全一致）を設定
6. `npm run build` が通れば公開可能

## デプロイ（初回）

1. `git init && git add -A && git commit` → GitHub に public リポジトリを作成して push
2. GitHub: Settings → Actions → General → Workflow permissions を **Read and write** に（daily-update の自動コミットに必要）
3. Vercel: リポジトリを Import（Hobby・環境変数の登録は不要）
4. 公開前に `/security-audit` を実行し、公開直後24時間は Deployment Protection を検討
5. ドメイン確定後、`NEXT_PUBLIC_SITE_URL` を Vercel の環境変数に設定（秘密情報ではない）

## セキュリティ・運用メモ

- `ANTHROPIC_API_KEY` は **ローカルの執筆時のみ**。Vercel にも GitHub にも置かない（Actions は議案DBの取得だけで LLM を使わない）
- Vercel Hobby は非商用限定。将来寄付等を入れる場合は Pro 移行を検討
- スマートニュース議案DBは MIT ライセンス（出典表記をトップとカルテの出典欄で明示済み）
- 数値が古いまま放置される事故（pre-mortem シナリオ2）への対策として、最終更新日時をトップに常時表示。Actions の失敗は GitHub から通知される
