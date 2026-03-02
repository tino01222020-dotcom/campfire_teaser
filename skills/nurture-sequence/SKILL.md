# Skill: Nurture Sequence（ナーチャリングシーケンス）

## 概要
リード登録からの経過時間に基づき、LINE Push / SendGrid Email を自動配信するエンジン。

## データモデル

```
sequences テーブル
├── id, name, channel (line|email)
├── delay_hours          ← 登録からの経過時間
├── trigger_type         ← 'delay' | 'event'（将来拡張）
├── content              ← メッセージ本文 or HTMLテンプレート
├── subject              ← メール件名（emailのみ）
├── phase (lead|backer)
├── status (draft|active|paused)
└── sort_order           ← 表示順

deliveries テーブル
├── sequence_id → sequences.id
├── lead_id → leads.id
├── status (pending|sent|opened|clicked|failed)
├── sent_at, opened_at, clicked_at
└── error
```

## 配信エンジンのロジック（`lib/nurture-engine.js`）

```
Cron（15分毎）
  → findPendingDeliveries()
    → 各 active シーケンスについて:
      → leads WHERE:
        ① phase が一致
        ② created_at + delay_hours <= NOW()
        ③ deliveries に同一 sequence_id + lead_id がない
        ④ channel に対応する連絡先がある（line_user_id or email）
      → LIMIT 100（バースト防止）
  → executeDelivery() × 各ペア
    → LINE: pushMessage() or SendGrid: sendNurtureEmail()
    → 成功: deliveries に status='sent' 記録
    → 失敗: deliveries に status='failed' + error 記録
  → 50ms間隔（LINE Rate Limit考慮）
```

## フェーズ別推奨シーケンス

### リード創出フェーズ

| # | 名前 | CH | 遅延 | 目的 |
|---|------|-----|------|------|
| 1 | 先行登録お礼 | LINE | 即座(0h) | 感謝 + 期待感醸成 |
| 2 | プロジェクトストーリー | Email | 24h | 共感形成 + ブランド理解 |
| 3 | リターン先行案内 | LINE | 72h | 限定感 + 具体的価値提示 |
| 4 | 開始リマインド | Email | 168h(7日) | 忘却防止 |
| 5 | 開始直前プッシュ | LINE | 開始前日 | 行動喚起 |

### 支援創出フェーズ

| # | 名前 | CH | 遅延 | 目的 |
|---|------|-----|------|------|
| 1 | クラファン開始通知 | LINE | 開始時(0h) | 最速認知 |
| 2 | 早割終了リマインド | LINE | 72h | 緊急感（早割終了前） |
| 3 | 進捗報告 + 社会的証明 | Email | 168h | 信頼性 + FOMO |
| 4 | ストレッチゴール告知 | LINE | イベント | 追加価値 |
| 5 | 残り3日リマインド | LINE | 終了3日前 | 最終プッシュ |
| 6 | ラストチャンス | Email | 最終日 | 最後の機会 |

## メッセージ設計ガイド

### LINE メッセージ
- 200文字以内
- 絵文字適度（先頭と末尾に1つずつが目安）
- リンクは短縮URL推奨
- 深夜配信NG（8:00-21:00に制限）

### Email
- 件名: 20-30文字
- 本文: HTMLテンプレート
- CTA: 1つに絞る
- カラー: CAMPFIREトークン準拠
  - ヘッダー背景: `bg_brand` (#EF4846)
  - CTAボタン: `bg_primary_green` (#39C288)
  - テキスト: `fg_primary` (#4D4A4A)
  - フッター: `bg_footer` (#393F48)

### AI生成（Claude API）
ナーチャリングページの「✨ AI で作成」ボタンから呼び出し:

```javascript
// プロンプト構造
`クラファン${phase==="lead"?"先行登録者":"支援検討者"}向けの${channel}メッセージ。
件名: ${subject}
目的: ${goal}
トーン: 親しみやすく、押し付けがましくない
${channel==="LINE" ? "200文字以内、絵文字適度" : "メール形式、HTMLテンプレート"}`
```

## 統計・KPI

```javascript
// getSequenceStats() の返り値
{
  id, name, channel, delay_hours, status, phase,
  sent: 1240,        // 配信数
  opened: 967,       // 開封数（Email: SendGrid Event Webhook, LINE: 統計API）
  clicked: 312,      // クリック数
  failed: 23,        // 失敗数
  open_rate: 78,     // 開封率 (%)
  click_rate: 25,    // クリック率 (%)
}
```

## Vercel Cron 設定

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/nurture",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**認証:** `authorization: Bearer ${CRON_SECRET}` ヘッダーで検証。
