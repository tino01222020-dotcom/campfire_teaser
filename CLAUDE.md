# CrowdFuel — CLAUDE.md

## プロジェクト概要

CrowdFuelは日本のクラウドファンディング（CAMPFIRE/Makuake/GreenFunding）向けの先行登録＆支援創出プラットフォーム。LP自動生成→デプロイ、広告データ集約、リード管理、ナーチャリング配信を一気通貫で提供するSaaS。

## アーキテクチャ

```
Next.js 14 (App Router) on Vercel
├── フロントエンド: React 18 + Recharts（シングルページダッシュボード）
├── バックエンド: Next.js Route Handlers（/app/api/）
├── DB: Vercel Postgres（リード/広告メトリクス/シーケンス/接続情報）
├── KV: Vercel KV（生成LP HTMLの保存・配信）
├── Cron: Vercel Cron（広告同期毎時/ナーチャリング15分毎）
└── 外部API: Meta Marketing / Google Ads / LINE Messaging / SendGrid / Claude API
```

## デザインシステム: CAMPFIRE Design Tokens

**このプロジェクトのUI全体はCAMPFIREの公式カラートークンに準拠する。**

トークン定義は `lib/design-tokens.js` を Single Source of Truth とする。コンポーネント内でハードコードされた色コードを使わず、必ずトークン経由で参照すること。

### カラー使用ルール

- **ブランドカラー（#EF4846）**: CAMPFIREブランド要素、ポジティブ強調、アクティブ状態
- **Primary Red（#E65D65）**: PA系primaryボタン、エラー背景
- **Primary Green（#39C288）**: 決済系primary、成功状態、アクティブ/選択状態のボーダー
- **Alert（#E13A43）**: 注意喚起・エラー。テキスト・背景・ボーダー全てに同色使用
- **Accent Yellow（#FAC75A）**: 支援済み表示、アクセント要素
- **Link Blue（#307BF6）**: テキストリンク、リンクボーダー

### フェーズ別カラーマッピング

| フェーズ | プライマリ | 使用トークン |
|---------|-----------|-------------|
| リード創出 | Green #39C288 | bg_primary_green / border_active |
| 支援創出 | Red #EF4846 | bg_brand / border_primary |

### テキスト階層

| トークン | 値 | 用途 |
|---------|-----|------|
| fg_primary_strong | #110114 | ヒーロー見出し |
| fg_primary | #4D4A4A | 本文テキスト |
| fg_secondary | #666666 | 副次テキスト |
| fg_tertiary | #999999 | プレースホルダー、注釈 |
| fg_inverse | #FFFFFF | カラー背景上のテキスト |

### 背景階層

| トークン | 値 | 用途 |
|---------|-----|------|
| bg_base | #F6F8FA | ページ背景（body） |
| bg_sub | #F0F2F4 | セクション背景 |
| bg_default | #FFFFFF | カード背景 |
| bg_disabled | #E4E4E4 | 非活性状態 |
| bg_footer | #393F48 | フッター、ダークエリア |

## コーディング規約

### ファイル構造

```
app/api/[resource]/route.js   — APIルート
lib/integrations/[provider].js — 外部API連携
lib/[utility].js               — 共通ユーティリティ
components/[Component].js      — UIコンポーネント
skills/                        — 開発スキル定義
```

### API ルート規約

- `GET` = データ取得、`POST` = 作成、`PATCH` = 更新、`DELETE` = 削除
- エラーレスポンス: `{ error: string }` + 適切なHTTPステータス
- 成功レスポンス: `{ success: true, ...data }`
- DB接続情報は `connections` テーブル経由で取得（環境変数直参照しない）
- CORS: `/api/leads` のみ `Access-Control-Allow-Origin: *`（LP cross-origin用）

### フロントエンド規約

- CSS-in-JS（inline style）で統一。外部CSSフレームワーク不使用
- 色は `lib/design-tokens.js` の `T` オブジェクト経由
- フォント: DM Sans（英数）+ Noto Sans JP（日本語）+ Outfit（数値）+ IBM Plex Mono（コード）
- アニメーション: CSS transition 0.2〜0.4s。派手なアニメーション禁止
- レスポンシブ: ダッシュボードはデスクトップ専用。LPはモバイルファースト

### LP生成規約

- Claude APIで生成するLPは完全なHTML（`<!DOCTYPE html>`〜`</html>`）
- CSSはインライン。外部シート不可（KVから単体配信のため）
- Google Fontsのみ外部CDN許可
- CAMPFIRE色トークンをベースにしたカラーパレット使用
- CTA色: リード創出フェーズ = `#39C288`（Green）、支援創出 = `#EF4846`（Red）

### データベース

- Vercel Postgres（`@vercel/postgres`の`sql`タグ）
- マイグレーション: `lib/db.js` の `migrate()` に集約
- `UNIQUE` 制約で冪等性担保（広告メトリクスのupsert等）
- タイムスタンプは全て `TIMESTAMPTZ`（UTC）

## 重要な設計判断

1. **SaaS型接続管理**: APIキーはユーザーが設定画面から入力→Postgres保存。環境変数直書きしない
2. **フェーズシステム**: `phase` state が全UIコンポーネントを制御。lead/backer の2値
3. **モック→リアルの漸進的切替**: API接続前はモックデータ表示、接続後は自動でリアルデータに切替
4. **LP配信**: 生成HTMLをVercel KVに保存し `/lp/[randomId]` で配信。SSR不要
5. **Cron**: 広告同期（毎時）とナーチャリング配信（15分毎）をVercel Cronで実行

## テスト・デバッグ

- DBマイグレーション: `POST /api/setup` （ヘッダー `x-setup-key` 必要）
- 広告同期手動実行: `GET /api/cron/sync-ads`（dev環境では認証スキップ）
- ナーチャリング手動実行: `GET /api/cron/nurture`
- リード手動登録: `POST /api/leads` with `{ "email": "test@example.com", "channel": "email" }`

## コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド
npm run start    # プロダクションサーバー
```
