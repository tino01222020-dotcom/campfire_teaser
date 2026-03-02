# Skill: LP Generation（ランディングページ生成）

## 概要
Claude APIを使ってCAMPFIRE準拠のLPを生成し、ランダムパスでVercel KVにデプロイする。

## カラートークン適用ルール

### 必須: `lib/design-tokens.js` から `getLPPalette(phase)` を使用

```javascript
import { getLPPalette, toCSSVariables, bg, fg, border, font } from '@/lib/design-tokens';
```

### LP内で使用するCSS変数

生成するHTMLの `<style>` に以下を埋め込む:

```css
:root {
  /* Background */
  --cf-bg-base: #F6F8FA;
  --cf-bg-default: #FFFFFF;
  --cf-bg-sub: #F0F2F4;
  --cf-bg-brand: #EF4846;
  --cf-bg-footer: #393F48;
  
  /* Text */
  --cf-fg-primary-strong: #110114;
  --cf-fg-primary: #4D4A4A;
  --cf-fg-secondary: #666666;
  --cf-fg-tertiary: #999999;
  --cf-fg-inverse: #FFFFFF;
  --cf-fg-link: #307BF6;
  
  /* Border */
  --cf-border-default: #D9DEE5;
  
  /* Phase-specific（プロンプトで切替） */
  --cf-primary: var(--phase-primary);      /* lead=#39C288 / backer=#EF4846 */
  --cf-primary-light: var(--phase-light);  /* lead=rgba(57,194,136,0.1) / backer=#FCEFF0 */
}
```

### フェーズ別CTA設計

#### リード創出フェーズ
```
CTA配置: デュアルCTA（LINE登録 + メール登録）
LINEボタン色: #39C288（bg_primary_green）
メールフォーム: bg_default(#FFFFFF) + border_default(#D9DEE5)
バッジ: 「CAMPFIREで近日公開」bg_brand(#EF4846) + fg_inverse(#FFFFFF)
コピー: 「先行登録で限定リターン情報をお届け」
```

#### 支援創出フェーズ
```
CTA配置: 「今すぐ支援する」大ボタン + 支援者数カウンター + 達成率バー + 残り日数
支援ボタン色: #EF4846（bg_brand）
達成率バー: #EF4846（bg_brand）on #F0F2F4（bg_sub）
バッジ: 「CAMPFIRE実施中」bg_brand + fg_inverse
緊急感: bg_attention(#FEF5E1)エリアで残り日数強調
```

## LP HTML構造テンプレート

```
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{プロダクト名} — {タグライン}</title>
  <meta property="og:title" content="{プロダクト名}">
  <meta property="og:description" content="{概要}">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    /* CSS変数 + レスポンシブスタイル */
    /* CAMPFIREトークン準拠 */
  </style>
</head>
<body>
  <!-- 1. ヒーロー: 背景bg_base、見出しfg_primary_strong -->
  <!-- 2. 課題提起: bg_default カード -->
  <!-- 3. ソリューション: bg_sub セクション -->
  <!-- 4. 特徴3つ: bg_default + border_default カード -->
  <!-- 5. CTA: phase依存（上記参照） -->
  <!-- 6. フッター: bg_footer + fg_inverse -->

  <script>
    // Intersection Observer アニメーション
    // UTMパラメータ取得
    // メールフォーム送信 → POST /api/leads
  </script>
</body>
</html>
```

## LP内フォーム送信のJS

```javascript
// メール登録フォーム
document.getElementById('email-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.querySelector('input[type="email"]').value;
  const params = new URLSearchParams(window.location.search);

  const res = await fetch('{ORIGIN}/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      channel: 'email',
      source_lp: '{LP_ID}',
      campaign: '{CAMPAIGN}',
      phase: '{PHASE}',
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
    }),
  });

  if (res.ok) {
    // 登録完了表示
  }
});
```

## LINE友だち追加リンク

```html
<a href="https://lin.ee/{LINE_ID}" style="
  display: inline-flex; align-items: center; gap: 8px;
  padding: 14px 32px; border-radius: 8px;
  background: #39C288; color: #FFFFFF;
  font-weight: 700; text-decoration: none;
">
  <svg width="24" height="24"><!-- LINE icon --></svg>
  LINEで先行登録
</a>
```

## デプロイフロー

1. フロントエンドでClaude APIを呼び出しHTML生成
2. 生成HTML内のフォームaction URLを `window.location.origin + '/api/leads'` に差し替え
3. `POST /api/deploy-lp` → ランダム8文字ID生成 → KV保存
4. `/lp/{id}` で配信開始
5. KV配信時に `Cache-Control: public, s-maxage=60` 付与

## 品質チェックリスト

- [ ] CAMPFIREカラートークン準拠（ハードコードHEX値なし）
- [ ] OGPメタタグ（title, description, image）設定済み
- [ ] モバイルレスポンシブ（375px〜）
- [ ] Intersection Observerアニメーション動作
- [ ] フォーム送信 → /api/leads 疎通
- [ ] UTMパラメータ取得・送信
- [ ] LINE友だち追加リンク正常動作
- [ ] Lighthouse Performance 90+
