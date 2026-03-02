// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CAMPFIRE Design Tokens — Single Source of Truth
// Source: campfire-all-color-tokens.csv
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Background Tokens ──
export const bg = {
  base:             '#F6F8FA',   // 基本のbody背景色
  sub:              '#F0F2F4',   // 副次的な背景色
  default:          '#FFFFFF',   // body上の要素の基本背景色
  disabled:         '#E4E4E4',   // 非活性状態
  brand:            '#EF4846',   // ブランドカラー（CAMPFIRE Red）
  primaryRed:       '#E65D65',   // PA:primaryボタン / PO:エラー背景
  primaryGreen:     '#39C288',   // PA:決済primary / PO:primaryボタン
  information:      'rgba(57,194,136,0.1)',  // PO:インフォメーション背景
  success:          '#C0F2DC',   // PO:success toast背景
  checkoutPrimary:  '#00C4AC',   // PA:決済ログインprimary
  accent:           '#FAC75A',   // アクセント（支援済み吹き出し等）
  attention:        '#FEF5E1',   // 確認必須項目・注意書き背景
  alert:            '#E13A43',   // 注意喚起強調背景
  alertWeak:        '#FCEFF0',   // 注意喚起弱背景
  footer:           '#393F48',   // フッター背景
  secondaryPo:      '#393F48',   // PO副次背景
  secondaryPa:      '#4D4A4A',   // PA副次背景
  tag:              '#BBBBBB',   // 白文字が乗る無彩色タグ
  furusatoBase:     '#F8F5F0',   // ふるさと納税base
  furusatoPrimary:  '#F54643',   // ふるさと納税primary
  machiyaPrimary:   '#B71109',   // machiya primary
  machiyaSecondary: '#958815',   // machiya 達成率バー
};

// ── Foreground (Text) Tokens ──
export const fg = {
  primaryStrong:    '#110114',   // TOPヒーロー、オンボーディング
  primary:          '#4D4A4A',   // 基本の文字色
  secondary:        '#666666',   // 副次テキスト
  tertiary:         '#999999',   // 三次テキスト（プレースホルダー等）
  disabled:         'rgba(77,74,74,0.3)',  // 非活性テキスト
  link:             '#307BF6',   // テキストリンク
  alert:            '#E13A43',   // 注意喚起テキスト
  brand:            '#EF4846',   // ブランドカラーテキスト / ポジティブ強調
  accent:           '#FAC75A',   // アクセントテキスト
  inverse:          '#FFFFFF',   // カラー背景上のテキスト
};

// ── Border Tokens ──
export const border = {
  default:          '#D9DEE5',   // 基本の枠線・仕切り線
  sub:              '#E5E7EB',   // 副次枠線
  inset:            '#F3F3F3',   // カード枠線（探すページ等）
  alert:            '#E13A43',   // 注意喚起枠線
  primary:          '#EF4846',   // ブランド枠線 / アクティブ・選択状態
  active:           '#39C288',   // アクティブ・選択状態（副次）
  secondary:        '#393F48',   // secondary要素ボタン枠
  link:             '#307BF6',   // リンク枠線
  inverse:          '#FFFFFF',   // カラー/画像背景上の線色
};

// ── Phase-specific Mappings ──
export const phase = {
  lead: {
    primary:      bg.primaryGreen,    // #39C288
    primaryLight: bg.information,     // rgba(57,194,136,0.1)
    accent:       border.active,      // #39C288
    label:        'リード創出',
    sub:          '先行登録フェーズ',
    icon:         '◎',
    kpis:         ['CVR', 'CPL', 'リード数', 'CTA率'],
  },
  backer: {
    primary:      bg.brand,           // #EF4846
    primaryLight: bg.alertWeak,       // #FCEFF0
    accent:       border.primary,     // #EF4846
    label:        '支援創出',
    sub:          'クラファン実施フェーズ',
    icon:         '⬡',
    kpis:         ['CVR', 'CPA', '支援者数', '支援額'],
  },
};

// ── Semantic Aliases (for component use) ──
export const semantic = {
  success:          bg.primaryGreen,   // #39C288
  successLight:     bg.success,        // #C0F2DC
  error:            bg.alert,          // #E13A43
  errorLight:       bg.alertWeak,      // #FCEFF0
  warning:          bg.accent,         // #FAC75A
  warningLight:     bg.attention,      // #FEF5E1
  info:             fg.link,           // #307BF6
};

// ── Typography ──
export const font = {
  sans:   "'DM Sans', 'Noto Sans JP', sans-serif",
  display:"'Outfit', 'DM Sans', 'Noto Sans JP', sans-serif",
  mono:   "'IBM Plex Mono', monospace",
  jp:     "'Noto Sans JP', sans-serif",
};

// ── Spacing & Radius ──
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// ── Combined Token Object (T) for inline styles ──
// Use: style={{ background: T.bg.base, color: T.fg.primary }}
export const T = { bg, fg, border, phase, semantic, font, radius };

// ── CSS Custom Properties Generator (for LP HTML injection) ──
export function toCSSVariables() {
  const vars = [];
  for (const [key, val] of Object.entries(bg))     vars.push(`--cf-bg-${key}: ${val};`);
  for (const [key, val] of Object.entries(fg))      vars.push(`--cf-fg-${key}: ${val};`);
  for (const [key, val] of Object.entries(border))  vars.push(`--cf-border-${key}: ${val};`);
  return `:root {\n  ${vars.join('\n  ')}\n}`;
}

// ── LP Generation Color Palette (inlined in generated HTML) ──
export function getLPPalette(phaseId = 'lead') {
  const p = phase[phaseId];
  return {
    primary:      p.primary,
    primaryLight: p.primaryLight,
    text:         fg.primary,
    textStrong:   fg.primaryStrong,
    textSub:      fg.secondary,
    textMuted:    fg.tertiary,
    textInverse:  fg.inverse,
    bgBase:       bg.base,
    bgCard:       bg.default,
    bgSub:        bg.sub,
    border:       border.default,
    brand:        bg.brand,
    success:      bg.primaryGreen,
    alert:        bg.alert,
    accent:       bg.accent,
    link:         fg.link,
    footer:       bg.footer,
  };
}

export default T;
