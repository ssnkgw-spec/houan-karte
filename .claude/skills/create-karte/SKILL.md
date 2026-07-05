---
name: create-karte
description: 法案カルテを新規作成する。素材ファイル(work/素材-<id>.md)から下書き生成・バリデーション・修正を最大5回ループし、全通過後に承認を得てgit push まで一括実行する。/gather-sources の後に使う(Phase B・生成)。
---

# 新規カルテ生成ループ(Phase B)

`/gather-sources` で作った素材ファイルから、カルテデータを完全自動生成する。

## 入力
引数に bill-id を指定(例:`chosakuken-kaisei`)。

## Step 0: 準備確認

以下を確認する:
- `work/素材-<bill-id>.md` が存在すること(なければ `/gather-sources` を先に実行するよう案内して停止)
- `content/bills/<bill-id>.ts`(確定済み)が存在しないこと(既存なら警告して停止)

## Step 1: 初期下書き生成（セッション内で直接書く）

**`claude -p` や外部スクリプトは使わない**（入れ子実行は許可プロンプトで壊れる）。このセッションの Claude が以下を Read してから、`content/bills/<bill-id>.draft.ts` を Write ツールで直接生成する:

1. `work/素材-<bill-id>.md`（一次資料）
2. `content/bills/kojin-joho.ts`（出力形式のお手本。この構成・記法に従う）
3. `content/schema.ts`（Bill 型スキーマ）

執筆ルール（SERVICE_DESIGN.md §6 L2/L3）:
- 素材テキストに書かれていないことは一切書かない（推測・一般知識による補完の禁止）
- すべての事実ブロックに snippet フィールドを付ける（素材の逐語スニペット30字程度）
  - 例: `{ type: "paragraph", text: "…{1}", snippet: "素材の逐語テキスト" }`
  - oldnew は oldSnippet / newSnippet、timeline・log の各 item にも snippet を付ける
  - scope の各 row にも snippet を付ける
- 賛否にあたる見解は必ず「どの会派・主体が述べたか」を明示。可能な限り逐語引用にする
- 推奨・誘導表現（〜すべき、望ましい等）を運営の地の文に書かない
- 立場ブロックは各立場の分量を均等にする

## Step 1.5: 敵対的チェック（サブエージェントに委任）

下書き生成と**独立した検証**のため、Agent ツール（general-purpose）に以下のプロンプトで委任する:

> あなたは敵対的チェッカー。`work/素材-<bill-id>.md`（素材）と `content/bills/<bill-id>.draft.ts`（下書き）を Read し、下書きの各記述について素材テキストとの含意関係を独立に検証せよ。
> 出力はフラグの Markdown リスト:
> - [FLAG-帰属] 発信元の帰属が素材と一致しない/確認できない記述
> - [FLAG-根拠] 素材に根拠が見つからない記述
> - [FLAG-誘導] 断定・誘導・推奨と読める表現
> - [FLAG-不均等] 立場ブロックの長さ・位置の不均等
> 各フラグに「該当箇所の引用」と「素材側の該当スニペット（無ければ『見つからず』）」を添える。問題がなければ「フラグなし」。
> 結果を `work/review-report-<bill-id>.md` に Write せよ。冒頭に `# 検証レポート: <bill-id>` と生成日時、末尾に以下の人間ゲートを付ける:
>
> ```
> ## 人間ゲート（§6-3・公開前に必ず確認）
> - [ ] フラグの立った帰属が、引用スニペットと一致しているか
> - [ ] 各立場が発信元ラベルつきで、長さ・位置が均等か
> - [ ] 「射程外」に留保が付いているか
> - [ ] 推奨・誘導表現が混入していないか
> ```

FLAG が付いたら、Step 2 の修正ループで素材と照合しながら .draft.ts を修正する（素材に根拠のない記述は削除が原則）。

## Step 2: バリデーションループ(最大5回)

各ループで以下を順に実行し、**全て通過するまで繰り返す**。

### 2-1. TypeScript コンパイル
```
npm run typecheck
```
失敗した場合:**他のチェックはスキップ**し、エラー内容を見てから .draft.ts を修正する。

### 2-2. lint チェック
```
node --import tsx scripts/lint-draft.ts <bill-id>
```

### 2-3. 構造チェック
```
node --import tsx scripts/_check-draft-extra.ts <bill-id>
```
stdout に JSON 配列が出る。`[]` なら通過。

### 2-4. HTML プレビュー生成
```
node --import tsx scripts/preview-draft.ts <bill-id>
```
生成された `work/preview-<bill-id>.html` に `id="s1"` ~ `id="s8"`, `id="sources"` が全て存在するか Read で確認する。

### 修正(問題があった場合)

**`claude -p` は使わない。** 問題点をまとめ、`content/bills/<bill-id>.draft.ts` を **Edit ツールで直接修正**する。

修正ルール:
- `content/schema.ts` の Bill 型スキーマを厳守する
- 素材に書かれている事実のみを使い、推測・一般知識による補完は禁止
- 出典参照 {N} は sources 配列の id と必ず対応させる
- s4(主な論点)には立場の異なる position ブロックを均等に2つ以上含める
- s6(これまでの経緯)には log ブロックを含める(審議経過の記録)
- s8(よくある声と射程)には scope ブロックを含める
- sources の url は go.jp / lg.jp / github.com/smartnews-smri のみ許可
- 推奨・誘導表現(~すべき、望ましい等)を地の文に書かない

5回試行しても解決しない場合は、残課題を一覧表示して停止する。

## Step 3: 承認確認

全バリデーション通過後、ユーザーに以下を伝える:
1. 通過ログのサマリー(何回目で通過したか)
2. `work/preview-<bill-id>.html` をブラウザで開いて確認するよう案内
3. 「**確認できたら「承認」と返信してください**」

## Step 4: 確定・コミット(承認後)

ユーザーが「承認」または「y」と返信したら実行する。

### 4-1. .draft.ts → .ts にリネーム
```
mv content/bills/<bill-id>.draft.ts content/bills/<bill-id>.ts
```

### 4-2. content/bills/index.ts を Edit で更新

変数名は kebab-case → camelCase に変換する(例:`chosakuken-kaisei` → `chosakukenKaisei`)。

**import 追加**:最後の `import ... from "./...";` 行の直後に挿入する。
```
import <camelId> from "./<bill-id>";
```

**bills 配列追加**:`export const bills: Bill[] = [` の次の行(先頭)に挿入する。
```
  Bill.parse(<camelId>),
```

### 4-3. git commit & push
```
git add content/bills/<bill-id>.ts content/bills/index.ts
git commit -m "feat: <法案タイトル>のカルテ初版を追加

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

法案タイトルは `content/bills/<bill-id>.ts` の `title:` フィールドから取得する。

## 参考

品質基準:`content/bills/kojin-joho.ts`(個人情報保護法等改正案)と同等の構造
