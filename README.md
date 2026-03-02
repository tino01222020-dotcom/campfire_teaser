# CrowdFuel — クラファン先行登録 & 支援創出エンジン

## 🚀 セットアップ（5分）

### 1. Git → Vercel デプロイ

```bash
git init && git add . && git commit -m "init"
git remote add origin git@github.com:YOUR_ORG/crowdfuel.git
git push -u origin main
```

Vercel Dashboard → **New Project** → **Import Git Repository** → Deploy

### 2. Storage 追加（Vercel Dashboard）

| Storage | 手順 |
|---------|------|
| **KV** | Storage → Create → KV → プロジェクトにリンク |
| **Postgres** | Storage → Create → Postgres → プロジェクトにリンク |

環境変数は自動設定。**Redeploy** で反映。

### 3. DB 初期化

デプロイ後、ダッシュボード → **設定・連携** → **🚀 マイグレーション実行** ボタン

### 4. サービス接続

**設定・連携** 画面から各サービスの API キーを入力するだけ:

| サービス | 登録者が必要なもの |
|---------|-------------------|
| LINE公式 | Channel Access Token + Channel Secret |
| SendGrid | API Key + 送信元メール |
| Meta Ads | Access Token + Ad Account ID |
| Google Ads | Developer Token + OAuth2 情報 |
| X Ads | API Key/Secret + Access Token |

---

## 📐 アーキテクチャ

```
crowdfuel/
├── app/
│   ├── page.js                         # ダッシュボード
│   ├── api/
│   │   ├── setup/                      # POST: DB マイグレーション
│   │   ├── settings/connections/       # GET/POST/DELETE: API接続管理
│   │   ├── leads/                      # POST: リード登録 / GET: 統計
│   │   ├── webhook/line/               # POST: LINE Webhook受信
│   │   ├── ads/metrics/                # GET: 広告パフォーマンス集計
│   │   ├── analytics/funnel/           # GET: コンバージョンファネル
│   │   ├── sequences/                  # CRUD: ナーチャリングシーケンス
│   │   ├── export/leads/               # GET: リードCSVエクスポート
│   │   ├── deploy-lp/                  # POST: LP → KV → ランダムURL
│   │   ├── list-lps/                   # GET: デプロイ済みLP一覧
│   │   └── cron/
│   │       ├── sync-ads/               # 毎時: 広告データ同期
│   │       └── nurture/                # 15分毎: 配信エンジン実行
│   └── lp/[id]/                        # GET: LP配信 (/lp/a8f3k2d1)
├── lib/
│   ├── db.js                           # Postgres クライアント + マイグレーション
│   ├── nurture-engine.js               # 配信スケジューラ
│   └── integrations/
│       ├── meta.js                     # Meta Marketing API
│       ├── google-ads.js               # Google Ads API (REST)
│       ├── line.js                     # LINE Messaging API
│       └── sendgrid.js                 # SendGrid v3 API
├── components/
│   └── CrowdFuel.js                    # メインUIコンポーネント
└── vercel.json                         # Cron ジョブ設定
```

## 🔄 データフロー

```
[広告] Meta/Google/X
  ↓ Cron 毎時同期
  ↓
[LP] /lp/ランダムID  ←  Claude API で生成
  ↓ CTA クリック
  ↓
[リード登録]
  ├─ LINE友だち追加 → Webhook → DB
  └─ メール入力 → POST /api/leads → DB → SendGrid 確認メール
      ↓
[ナーチャリング] Cron 15分毎
  ├─ LINE Push Message（delay_hours 経過後）
  └─ SendGrid Email（delay_hours 経過後）
      ↓
[ダッシュボード]
  ├─ リアルタイム統計（リード数/CVR/CPL/CPA）
  ├─ プラットフォーム別パフォーマンス
  ├─ コンバージョンファネル
  └─ CSVエクスポート
```

## 🔑 フェーズ別 KPI

| | リード創出 | 支援創出 |
|---|---|---|
| KPI | CVR, CPL | CVR, CPA |
| CTA | LINE + Email 登録 | 今すぐ支援ボタン |
| ファネル | 広告→LP→登録完了 | 広告→CF→支援完了 |

## 💰 ランニングコスト

| サービス | 月額 |
|---------|------|
| Vercel Pro | $20 |
| KV + Postgres | 含む（無料枠内） |
| LINE コミュニケーション | ¥0（200通/月） |
| SendGrid Free | $0（100通/日） |
| 広告API | 無料 |
| Claude API | ~¥2,000〜 |
