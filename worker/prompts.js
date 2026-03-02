// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CrowdFuel — Claude プロンプトテンプレート
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SYSTEM_PROMPT = `あなたはCAMPFIRE（クラウドファンディング）のマーケティングAIアシスタント「CrowdFuel」です。
日本のクラウドファンディング市場に精通し、支援者を集めるためのLP・広告・ナーチャリングに特化しています。

ブランドトーン:
- 親しみやすく、でもプロフェッショナル
- データドリブンで具体的な提案
- CAMPFIRE Red (#EF4846) をブランドカラーとして意識

フェーズ:
- lead: リード創出フェーズ（先行登録）
- backer: 支援創出フェーズ（クラファン実施中）
`;

export const TASK_PROMPTS = {
  // ── LP自動生成 ──
  generate_lp: (input) => `
以下の情報をもとに、クラウドファンディングプロジェクトのランディングページ（LP）のHTMLを生成してください。

プロジェクト名: ${input.project_name || '未設定'}
フェーズ: ${input.phase || 'lead'}
ターゲット: ${input.target || '一般'}
プロジェクト概要: ${input.description || ''}
目標金額: ${input.goal_amount || '未設定'}
特徴・リターン: ${input.features || ''}
追加指示: ${input.extra || ''}

要件:
- レスポンシブデザイン（モバイルファースト）
- CAMPFIREのブランドカラー (#EF4846) を使用
- CTA（先行登録 or 支援する）を目立たせる
- OGP用のmeta tagも含める
- 完全な単体HTMLファイルとして出力（CSS・JSインライン）
- 日本語で記述

JSON形式で返答してください:
{
  "html": "<!DOCTYPE html>...",
  "title": "LPタイトル",
  "meta_description": "OGP用説明文"
}
`,

  // ── ナーチャリング文面生成 ──
  generate_nurture: (input) => `
クラウドファンディングプロジェクトのナーチャリングシーケンスを作成してください。

プロジェクト名: ${input.project_name || '未設定'}
チャネル: ${input.channel || 'email'}
フェーズ: ${input.phase || 'lead'}
ステップ数: ${input.steps || 5}
プロジェクト概要: ${input.description || ''}
追加指示: ${input.extra || ''}

${input.channel === 'line' ? 'LINEメッセージは200文字以内で簡潔に。' : 'メールは件名 + 本文で作成。'}

JSON形式で返答してください:
{
  "sequences": [
    {
      "name": "ステップ名",
      "delay_hours": 0,
      "subject": "件名（emailの場合）",
      "content": "本文",
      "channel": "${input.channel || 'email'}"
    }
  ]
}
`,

  // ── データ分析・レポート ──
  analyze_data: (input) => `
以下のマーケティングデータを分析し、インサイトとアクションアイテムを提示してください。

データ:
${JSON.stringify(input.data || {}, null, 2)}

分析観点: ${input.focus || '全般的なパフォーマンス分析'}
フェーズ: ${input.phase || 'lead'}
追加指示: ${input.extra || ''}

JSON形式で返答してください:
{
  "summary": "概要（1-2文）",
  "insights": ["インサイト1", "インサイト2", ...],
  "actions": ["アクション1", "アクション2", ...],
  "metrics": { "key": "value" }
}
`,

  // ── 広告コピー生成 ──
  generate_ad_copy: (input) => `
クラウドファンディングプロジェクトの広告コピーを生成してください。

プロジェクト名: ${input.project_name || '未設定'}
プラットフォーム: ${input.platform || 'meta'}
フェーズ: ${input.phase || 'lead'}
ターゲット: ${input.target || '一般'}
プロジェクト概要: ${input.description || ''}
追加指示: ${input.extra || ''}

${input.platform === 'google' ? 'Google広告: 見出し30文字以内×3、説明文90文字以内×2' : 'Meta/Instagram: メインテキスト、見出し、説明文、CTA'}

JSON形式で返答してください:
{
  "variants": [
    {
      "name": "バリエーション名",
      "headlines": ["見出し1", ...],
      "descriptions": ["説明文1", ...],
      "cta": "CTA文"
    }
  ]
}
`,

  // ── シーケンス提案 ──
  suggest_sequence: (input) => `
既存のナーチャリングデータに基づいて、改善提案を行ってください。

現在のシーケンス:
${JSON.stringify(input.current_sequences || [], null, 2)}

パフォーマンスデータ:
${JSON.stringify(input.performance || {}, null, 2)}

フェーズ: ${input.phase || 'lead'}
追加指示: ${input.extra || ''}

JSON形式で返答してください:
{
  "analysis": "現状分析",
  "suggestions": [
    {
      "type": "改善/追加/削除",
      "target": "対象ステップ",
      "suggestion": "具体的な提案",
      "expected_impact": "期待される効果"
    }
  ]
}
`,
};
