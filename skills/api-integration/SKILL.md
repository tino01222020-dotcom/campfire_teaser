# Skill: API Integration（外部API連携）

## 概要
広告プラットフォーム（Meta/Google/X）およびメッセージングサービス（LINE/SendGrid）のAPI連携パターン。

## アーキテクチャ原則

### 認証情報の管理
```
ユーザーが設定画面で入力
  → POST /api/settings/connections
    → Vercel Postgres `connections` テーブルに保存
      → 各integration が getConnection(provider) で取得
```

**禁止事項:**
- 環境変数にAPIキーを直書きしない（SaaS型のため）
- フロントエンドにAPIキーを渡さない
- ログにAPIキーを出力しない

### ファイル配置規約
```
lib/integrations/
├── meta.js         — Meta Marketing API (Graph API v21.0)
├── google-ads.js   — Google Ads API (REST v18)
├── line.js         — LINE Messaging API (v2)
└── sendgrid.js     — SendGrid Web API (v3)
```

各ファイルは以下の構造を持つ:
```javascript
import { getConnection, sql } from '../db.js';

// 1. 認証情報取得
export async function get{Provider}Credentials() { ... }

// 2. データ取得 / アクション実行
export async function fetch{Resource}(creds, params) { ... }

// 3. DB同期（Cronから呼ばれる）
export async function sync{Provider}Metrics(creds, phase) { ... }
```

## Meta Marketing API

### エンドポイント
- Base: `https://graph.facebook.com/v21.0`
- Insights: `/{ad_account_id}/insights`
- Campaigns: `/{ad_account_id}/campaigns`

### 認証
- Long-lived Access Token（60日有効）
- App ID + App Secret で自動更新可能

### credentials 構造
```json
{
  "access_token": "EAAxxxx",
  "ad_account_id": "act_123456789",
  "app_id": "xxx",
  "app_secret": "xxx"
}
```

### データ取得パターン
```javascript
const fields = 'campaign_name,campaign_id,impressions,clicks,spend,actions,ctr';
const url = `${GRAPH_API}/${ad_account_id}/insights?fields=${fields}&date_preset=last_14d&level=campaign&time_increment=1&access_token=${token}`;
```

### KPI マッピング
| Meta API field | CrowdFuel DB column |
|---|---|
| `impressions` | `impressions` |
| `clicks` | `clicks` |
| `spend` | `spend` |
| `actions[lead_generation]` | `conversions`（リード創出） |
| `actions[offsite_conversion.fb_pixel_purchase]` | `conversions`（支援創出） |
| `cost_per_lead` (計算) | `cpl` |
| `cost_per_action` (計算) | `cpa` |

### トークン更新
```javascript
// 60日前に自動更新
const res = await fetch(
  `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`
);
```

## Google Ads API

### エンドポイント
- Base: `https://googleads.googleapis.com/v18`
- SearchStream: `/customers/{customerId}/googleAds:searchStream`

### 認証
- OAuth 2.0 Refresh Token → Access Token 都度交換
- Developer Token（ヘッダー送信）

### credentials 構造
```json
{
  "developer_token": "22文字英数字",
  "client_id": "xxx.apps.googleusercontent.com",
  "client_secret": "xxx",
  "refresh_token": "xxx",
  "customer_id": "1234567890",
  "login_customer_id": "オプション（MCC経由の場合）"
}
```

### GAQL クエリ
```sql
SELECT
  campaign.id, campaign.name, campaign.status,
  metrics.impressions, metrics.clicks, metrics.cost_micros,
  metrics.conversions, metrics.conversions_value, metrics.ctr,
  segments.date
FROM campaign
WHERE segments.date BETWEEN '{start}' AND '{end}'
  AND campaign.status != 'REMOVED'
```

### 注意点
- `cost_micros` → `spend` の変換: `/ 1_000_000`
- Customer IDからハイフン除去: `.replace(/-/g, '')`
- Explorer Access: 2,880 operations/日（初期）

## LINE Messaging API

### エンドポイント
- Base: `https://api.line.me/v2`
- Push: `/bot/message/push`
- Reply: `/bot/message/reply`
- Profile: `/bot/profile/{userId}`

### credentials 構造
```json
{
  "channel_access_token": "xxx",
  "channel_secret": "xxx",
  "project_name": "プロジェクト名（ウェルカムメッセージ用）"
}
```

### Webhook 処理
```
POST /api/webhook/line
  → x-line-signature ヘッダーで署名検証（HMAC-SHA256）
  → event.type === 'follow' → リード登録 + ウェルカムメッセージ
  → event.type === 'unfollow' → リードのphaseを'unfollowed'に更新
```

### メッセージ種別
| タイプ | 用途 |
|--------|------|
| `text` | シンプルテキスト（ナーチャリング） |
| `flex` | リッチメッセージ（ウェルカム、リターン案内） |

### 配信上限
| プラン | 月間無料メッセージ |
|--------|-------------------|
| コミュニケーション | 200通 |
| ライト（¥5,000/月） | 5,000通 |
| スタンダード（¥15,000/月） | 30,000通 |

## SendGrid Web API v3

### エンドポイント
- Send: `POST https://api.sendgrid.com/v3/mail/send`

### credentials 構造
```json
{
  "api_key": "SG.xxxx",
  "from_email": "hello@yourdomain.com"
}
```

### 必須設定（PoliLog側）
1. 送信ドメインのDNS認証（SPF + DKIM）
2. API Key（Full Access or Mail Send）
3. Single Sender Verification（ドメイン認証前の代替）

### トラッキング
```javascript
tracking_settings: {
  click_tracking: { enable: true },
  open_tracking: { enable: true },
}
```

## DB同期パターン（ad_metrics テーブル）

```sql
INSERT INTO ad_metrics (provider, campaign_id, campaign_name, date, ...)
VALUES ($1, $2, $3, $4, ...)
ON CONFLICT (provider, campaign_id, date) DO UPDATE SET
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  spend = EXCLUDED.spend,
  ...
  synced_at = NOW()
```

- `UNIQUE(provider, campaign_id, date)` で冪等性担保
- Cron毎時実行で14日分を上書き（Meta/Googleの遅延データ反映のため）

## エラーハンドリング

| エラー | 対応 |
|--------|------|
| Meta 190 (Token Expired) | `META_TOKEN_EXPIRED` エラー返却。設定画面で再接続促す |
| Google 401 | Refresh Token で再取得。失敗なら再認証 |
| LINE 429 (Rate Limit) | 50ms間隔で再試行（最大3回） |
| SendGrid 403 | API Key権限不足。設定画面で確認促す |
| Network Error | `results.errors[]` に記録。次回Cronで再試行 |
