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
