# 修正案自動生成ルーティン

このファイルは Claude スケジュールタスク `houan-karte-correction-draft`（毎朝 07:15 JST）が参照する実行手順の**単一の真実**です。スケジュールタスク側の SKILL.md はこのファイルへのポインタのみ。手順の変更はこのファイルだけを編集する。

## 目的

`content/data/pending-refresh.json` に未処理エントリがある場合、法案ステータスの修正案を自動生成して GitHub PR を作成し、ユーザーに確認を求める。

## 実行環境

- プロジェクトルート: `/Users/kk/Documents/Development/projects/houan-karte`
- 必要なCLI: `git`, `gh`, `node --import tsx`

## 手順

### Step 1: 最新コードを取得

```bash
cd /Users/kk/Documents/Development/projects/houan-karte
git pull origin main
```

### Step 2: pending-refresh.json を確認

`content/data/pending-refresh.json` を読む。

```json
// 空の場合（対応不要）
{}

// エントリがある場合（各法案IDがキー）
{
  "kojin-joho": {
    "dbStatus": "参議院で可決・成立",
    "changedAt": "2026-07-01",
    "keikaUrl": "https://www.sangiin.go.jp/..."
  }
}
```

エントリが空（`{}`）ならここで終了。「本日の pending-refresh は空です」と報告。

### Step 3: 既存の draft/correction-* PR を確認

```bash
gh pr list --repo ssnkgw-spec/houan-karte --search "draft/correction" --state open
```

オープンなPRがあればその内容とVercel PreviewのURLを表示し、マージの確認を先に求める。

### Step 4: 修正案の生成（未処理エントリごとに繰り返す）

対象の法案ファイル `content/bills/{billId}.ts` を読み込み、`keikaUrl` の内容を fetch する。

修正する内容:
- `status` フィールド: 新しい審議状況の文章（例: "参議院で可決・成立（YYYY年M月DD日）"）
- `statusAsOf`: 今日の日付（`YYYY-MM-DD` 形式）
- `sections.s6.blocks` の `log` ブロック: 新しい審議イベントを先頭の items に追記（全カルテとも審議経過の log は s6「これまでの経緯」にある）

修正後に以下を実行して検証する:
```bash
npm run typecheck
npm run lint:neutrality
node --import tsx scripts/preview-draft.ts {billId}
# preview-draft.ts は .ts ファイルを直接読むので .draft.ts は不要
```

### Step 5: PR を作成

PR body には**変更サマリー表**と**人間ゲート4項目チェックリスト**を必ず含める（スマホでの確認を30秒で済ませるため）。

```bash
git checkout -b draft/correction-YYYYMMDD-{billId}
git add content/bills/{billId}.ts
git commit -m "自動修正: {法案名} — {新ステータス}"
gh pr create --title "自動修正: {法案名} — {新ステータス}" --body "{下のテンプレを埋めたもの}"
git checkout main
```

PR body テンプレ:

```markdown
## 変更サマリー
| 項目 | 旧 | 新 |
|------|----|----|
| status | {旧ステータス} | {新ステータス} |
| statusAsOf | {旧日付} | {今日} |
| s6 log | — | 「{追記したイベント文}」を先頭に追記 |

根拠: [経過情報ページ]({keikaUrl})

## 人間ゲート（マージ前に確認）
- [ ] 新ステータス・日付が経過情報ページの記載と一致しているか
- [ ] s6 log の追記文が機械的事実のみか（評価・誘導表現なし）
- [ ] 変更が status / statusAsOf / s6 log の3点に限定されているか
- [ ] Vercel Preview の表示が崩れていないか

## Vercel Preview
PR作成後、Vercel Botがコメントします。確認後、このPRをマージしてください。
```

### Step 6: ユーザーへの報告

PR作成後、セッション内で以下を報告する:

- 修正した法案名とステータス変化（旧 → 新）
- PR URL
- Vercel Preview URL（Vercel Bot のコメントから取得、未到着の場合は「数分後に反映」と記載）

ユーザーが「マージ」と返信したら:
```bash
gh pr merge {PR番号} --squash --delete-branch
```

ユーザーが「却下」と返信したら:
```bash
gh pr close {PR番号} --comment "ユーザーにより却下されました"
```

## エラー処理

- `tsc --noEmit` 失敗: 修正案を破棄。`pending-refresh.json` のエントリはそのまま残す（翌日に再試行）
- `lint:neutrality` 失敗: 失敗内容をユーザーに報告し、修正を依頼
- `keikaUrl` の fetch が失敗: pending-refresh.json のエントリをそのまま残す
