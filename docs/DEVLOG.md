# DEVLOG — 法案カルテ

---

## 2026-06-14

### やったこと
- `draft-karte.ts` / `triage-corrections.ts` を `claude -p`（Claude Code CLIサブスク課金）に移行。コードから Anthropic API キー依存を完全排除
- `.claude/skills/gather-sources/SKILL.md` 新設。Phase A（一次資料収集）を `/gather-sources` スキルとして標準化（許可ドメイン限定・逐語引用必須）
- `scripts/detect-status-changes.ts` 新設（LLM不使用）。daily-update で commit 前に実行し、審議状況変化を `pending-refresh.json` に記録・`karte-refresh` Issue を起票
- 読者向け「進展あり・本文未反映」バナー/チップを実装（`lib/pending-refresh.ts` + 各ページ）。機械が進展を検知してから人間が本文を更新するまでの隙間を読者に正直に表示
- `daily-update.yml` に `issues: write` + detect ステップ追加。README に「自動更新の範囲」表・Phase A/B/C 手順を追記
- `/code-review high` でレビューし6件の指摘、4件を修正（triage-corrections の maxBuffer 欠落・bills/page の getBill スロー・page.tsx のゼロ除算・detect-status-changes の空文字 falsy）
- GitHub push 完了。ラベル4本作成・Workflow permissions 設定・運営者ハンドル置換も完了

### 気づき・メモ
- `claude -p` は stdout 全体を返すので旧 API の `c.type === "text"` フィルタとは異なる。思考ブロック混入リスクは未解決（PLAUSIBLE）
- `--max-tokens` 未指定なので CLI デフォルト次第で長い下書きが切れる可能性も残っている
- git remote が `.git/config` で SSH になっていることがある（`git remote -v` でなく `cat .git/config` で確認して HTTPS に直した）
- `/code-review high` は有用。見落としがちな `maxBuffer` 欠落と `throw` の危険な呼び出しを CONFIRMED で発見

### 次にやりたいこと
- 国家情報会議設置法案（閣法 No.24・令和8/6/3成立・公布）のカルテ1本目を書く → `/gather-sources` → `draft-karte.ts` → 人間ゲート
- `/security-audit` を実行してから正式公開
- `NEXT_PUBLIC_SITE_URL` を Vercel Production に登録（sitemap 用）

---

## 2026-06-16

### やったこと
- OGP 画像を実装（`app/opengraph-image.tsx` サイト全体・`app/bills/[id]/opengraph-image.tsx` 各法案個別）
- `lib/woff-to-sfnt.ts`：satori 用の woff→sfnt(TTF) 変換ユーティリティを実装
- 個人情報保護法等改正案のカルテを追加（`content/bills/kojin-joho.ts`）
- snippet 出典機能：各ブロックに `snippet` フィールドを追加し、カルテ画面に逐語引用を表示
- `lint:draft` / `preview:draft` スクリプト追加でドラフトワークフローを整備

### 気づき・メモ
- satori（Next.js `ImageResponse` の内部）は同名・同 weight のフォントエントリがあってもフォールバックしない。複数の woff サブセットを使うには各サブセットに別名（`NSJ0`〜`NSJ29`）をつけ、`fontFamily` を CSS フォールバックチェーンにする必要がある
- woff2 は satori 非対応（`Unsupported OpenType signature wOF2`）→ `.woff` を使用
- woff も ArrayBuffer でそのまま渡せない → zlib で展開して sfnt バイナリに変換してから渡す
- fontsource の 19 サブセットでは法案タイトル・サブタイトルに含まれる漢字が不足。スクリプトで必要サブセットを分析して 30 サブセットに拡張した

---

## 2026-06-16

### やったこと
- 会期ライフサイクル対応（Phase 1〜5）を実装・コミット（`d708fa0`）
  - `Bill.session` フィールド追加・全7法案に `session: 221` 付与
  - `dashboard.json` の session を履歴配列（`current` + `sessions[]`）に拡張
  - `lib/session-clock.ts` に `getSessionState()` / `SessionPhase` 追加（phase 判定）
  - `lib/status.ts` 新規作成（badge → tone マッピング集約）
  - `app/page.tsx` を phase 別トップ表示に改修（会期中 / 閉会中で主役差し替え）
  - `components/VotesPanel.tsx`・`components/EnforcementSchedule.tsx` 新規作成
  - intel-council に `votes`・`enforcement` データ追加
  - `scripts/lint-neutrality.ts` に enforcement / votes の sourceIds 束縛検査追加
- 採決パネルの配色変更：反対を slate（青灰）→ ochre（琥珀）に変更（視認性改善）
- Preview MCP でトップ・カルテ詳細・VotesPanel・EnforcementSchedule の表示を確認

### 気づき・メモ
- Preview MCP の `preview_screenshot` はスクロール位置を保持しない。`scrollIntoView` 後に撮っても常にページ先頭が写る。回避策：確認したいセクション以外を `display:none` にしてから撮影する
- `gh` 認証トークンが期限切れ。サンドボックスのネットワーク制限とも重なり push は手動で実施

### 次にやりたいこと
- `gh auth login` で再認証し `git push origin main`
- 他の成立法案（reservist など）に `enforcement` / `votes` データを追加
- 閉会時の recess モード表示を実際の会期終了後（2026-07-17 以降）に確認
- 利用規約・アーキテクチャドキュメントの整備

---

## 2026-06-16

### やったこと
- `/code-review` でサイト内検索実装を7角度・並列レビュー（finder 7本 + verifier 6本）
- 発見した6件の問題を修正・コミット（`027f2da`）:
  1. `router.push('#hash')` がスクロールしない → `window.location.href` / `scrollIntoView` に変更
  2. IME 変換確定 Enter で誤ナビゲート → `!e.nativeEvent.isComposing` ガード追加で解決済み
  3. NFKC のみ一致した全角文字で `<mark>` が空になる → `normHay` でスニペット位置を取るよう修正
  4. `<button role="option">` が不正 ARIA → `<div role="option" tabIndex={0}>` に変更
  5. hits 空のとき ArrowDown で `active` が -1 に → `Math.max(0, hits.length - 1)` でクランプ
  6. `MAX_HITS` 定数が未使用（結果無制限） → `.slice(0, MAX_HITS)` を適用
- Vercel デプロイ完了

### 気づき・メモ
- `.claude/launch.json` が `npx serve out` で静的ファイルを配信しているため HMR は効かない。コード変更後の動作確認には `npm run build` が必要
- Next.js App Router の `router.push('/path/#hash')` はハッシュスクロールを行わない。静的サイトでは `window.location.href` でブラウザネイティブ遷移するのが確実

### 次にやりたいこと
- 他の成立法案（reservist 等）に `enforcement` / `votes` データを追加
