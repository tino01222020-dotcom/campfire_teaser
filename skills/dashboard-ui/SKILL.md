# Skill: Dashboard UI（ダッシュボードUI）

## 概要
CrowdFuelダッシュボードのUIコンポーネントはCAMPFIREデザイントークンに準拠する。

## トークン使用規則

**絶対ルール: `lib/design-tokens.js` の `T` オブジェクトを import して使う。HEXコード直書き禁止。**

```javascript
import T from '@/lib/design-tokens';
// or
import { bg, fg, border, phase, semantic, font, radius } from '@/lib/design-tokens';
```

## コンポーネント別カラーマッピング

### ページ背景・レイアウト

| 要素 | トークン | 値 |
|------|---------|-----|
| ページ背景 | `T.bg.base` | #F6F8FA |
| サイドバー | `T.bg.footer` | #393F48 |
| カード背景 | `T.bg.default` | #FFFFFF |
| カード枠線 | `T.border.default` | #D9DEE5 |
| セクション背景 | `T.bg.sub` | #F0F2F4 |

### テキスト

| 要素 | トークン | 値 |
|------|---------|-----|
| ページタイトル | `T.fg.primaryStrong` | #110114 |
| 本文 | `T.fg.primary` | #4D4A4A |
| ラベル・キャプション | `T.fg.secondary` | #666666 |
| プレースホルダー | `T.fg.tertiary` | #999999 |
| 暗い背景上のテキスト | `T.fg.inverse` | #FFFFFF |
| リンク | `T.fg.link` | #307BF6 |

### フェーズトグル

```javascript
// T.phase[currentPhase] でフェーズ色を取得
const p = T.phase[phase]; // phase = 'lead' | 'backer'
// p.primary    → メインカラー
// p.primaryLight → 薄い背景色
// p.accent     → ボーダー色
// p.label      → 「リード創出」 or 「支援創出」
```

### 統計カード（StatCard）

```javascript
// 基本
background: T.bg.default    // #FFFFFF
border: T.border.default    // #D9DEE5

// トレンドバッジ
// 上昇（コスト以外）
background: T.semantic.successLight  // #C0F2DC
color: T.semantic.success            // #39C288

// 上昇（コスト系 = 悪化）
background: T.semantic.errorLight    // #FCEFF0
color: T.semantic.error              // #E13A43

// 下降（コスト系 = 改善）→ 上記の逆
```

### ステータスバッジ（StatusBadge）

| ステータス | 背景 | テキスト |
|-----------|------|---------|
| active（配信中） | `T.semantic.successLight` | `T.semantic.success` |
| paused（停止） | `T.bg.attention` (#FEF5E1) | `#D97706` |
| draft（下書き） | `T.bg.sub` | `T.fg.secondary` |
| deployed（デプロイ済） | `T.semantic.successLight` | `T.semantic.success` |
| error | `T.semantic.errorLight` | `T.semantic.error` |

### テーブル

```javascript
// ヘッダー行
background: T.bg.sub        // #F0F2F4
color: T.fg.secondary       // #666666
borderBottom: T.border.default

// データ行
background: T.bg.default    // #FFFFFF
borderBottom: T.border.sub  // #E5E7EB

// ホバー
background: T.bg.base       // #F6F8FA

// 強調セル（KPI列）
background: `${T.phase[phase].primary}08`  // フェーズ色の5%透過
```

### チャート（Recharts）

```javascript
// グラデーション定義
<linearGradient>
  <stop offset="0%" stopColor={T.phase[phase].primary} stopOpacity={0.18} />
  <stop offset="100%" stopColor={T.phase[phase].primary} stopOpacity={0} />
</linearGradient>

// 軸
tick={{ fontSize: 11, fill: T.fg.tertiary }}

// Tooltip
contentStyle={{
  borderRadius: T.radius.md,
  border: `1px solid ${T.border.default}`,
  fontSize: 12,
  fontFamily: T.font.sans,
}}

// プラットフォーム別カラー（広告）
const PLATFORM_COLORS = {
  Facebook:       '#1877F2',  // FB固有色（トークン外）
  Google:         '#EA4335',  // Google固有色
  'X (Twitter)':  T.fg.primaryStrong,  // #110114
  Instagram:      '#E4405F',
  'リターゲティング': T.fg.link,  // #307BF6
};
```

### ボタン

```javascript
// Primary
background: T.phase[phase].primary
color: T.fg.inverse
borderRadius: T.radius.sm

// Secondary
background: T.bg.default
color: T.fg.primary
border: `1px solid ${T.border.secondary}`

// Danger
background: T.semantic.error
color: T.fg.inverse

// Disabled
background: T.bg.disabled
color: T.fg.disabled
cursor: 'not-allowed'
```

### 入力フォーム

```javascript
// Input / Textarea
background: T.bg.base
border: `1.5px solid ${T.border.default}`
color: T.fg.primary
borderRadius: T.radius.sm
// Focus
border: `1.5px solid ${T.phase[phase].primary}`

// Label
color: T.fg.secondary
fontSize: 11
fontWeight: 600

// Placeholder
color: T.fg.tertiary
```

### ファネルバー（Analytics）

```javascript
// バー背景
background: T.bg.sub

// バーフィル
background: `linear-gradient(90deg, ${T.phase[phase].primary}, ${T.phase[phase].primary}BB)`

// 率テキスト
color: T.phase[phase].primary
fontFamily: T.font.display  // Outfit
```

## フォント使い分け

| 用途 | フォント | トークン |
|------|---------|---------|
| 見出し・数値 | Outfit | `T.font.display` |
| 本文 | DM Sans + Noto Sans JP | `T.font.sans` |
| コード・モノスペース | IBM Plex Mono | `T.font.mono` |

## アニメーション

```javascript
// トランジション基本
transition: 'all 0.2s ease'

// フェーズ切替（背景色変更等）
transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease'

// カードホバー
transition: 'box-shadow 0.15s ease, transform 0.15s ease'
// hover: boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transform: 'translateY(-1px)'
```

## レイアウト定数

```javascript
const LAYOUT = {
  sidebarWidth: 232,
  contentMaxWidth: 1060,
  contentPadding: '24px 36px',
  gridGap: 14,
  cardPadding: '20px 22px',
  sectionGap: 24,
};
```
