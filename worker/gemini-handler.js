// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CrowdFuel Gemini Handler — 画像生成 & リターン設計
// Google Gemini API で画像生成とリターンアイデア生成を処理
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { GoogleGenAI, Modality } from '@google/genai';

let ai = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// ── Style Prompts ──
const STYLE_PROMPTS = {
  MANGA: 'Create a manga-style illustration for a Japanese crowdfunding project. Use dynamic composition, expressive characters, and clean line art typical of Japanese manga. Style: professional manga art, detailed backgrounds.',
  REALISTIC: 'Create a photorealistic image for a Japanese crowdfunding project. Use professional photography style with natural lighting, shallow depth of field, and high-quality composition. Style: DSLR photography, 4K quality.',
  ILLUSTRATION: 'Create a warm, inviting illustration for a Japanese crowdfunding project. Use soft colors, gentle brushstrokes, and a hand-drawn feel. Style: editorial illustration, warm palette.',
  IMPACT_TEXT: 'Create a bold, eye-catching graphic with large impact text for a Japanese crowdfunding project. Use strong typography, vibrant colors, and dramatic composition. Style: advertisement poster.',
  FLYER: 'Create a professional flyer/poster design for a Japanese crowdfunding project. Include space for text, clean layout, and professional typography areas. Style: print-ready flyer design.',
  SNS_POP: 'Create a vibrant, social media optimized image for a Japanese crowdfunding project. Use bright colors, modern design trends, and attention-grabbing composition. Style: Instagram/Twitter post, square format.',
};

// ── Image Generation ──
export async function generateImage(input) {
  const genai = getAI();
  const style = input.style || 'ILLUSTRATION';
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.ILLUSTRATION;
  const userPrompt = input.prompt || '';

  const fullPrompt = `${stylePrompt}

Project: ${input.project_name || 'クラウドファンディングプロジェクト'}
Description: ${input.project_description || ''}
User request: ${userPrompt}

Important: The image should be visually appealing and suitable for Japanese crowdfunding marketing materials. Do not include any text in the image unless specifically requested.`;

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: fullPrompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    // Extract image from response
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          return {
            image_base64: part.inlineData.data,
            mime_type: part.inlineData.mimeType,
            style: style,
            revised_prompt: fullPrompt.slice(0, 200) + '...',
          };
        }
      }
    }

    // Fallback: try text-only response
    const text = response.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)
      ?.map(p => p.text)
      ?.join('\n');

    return {
      error: '画像の生成に失敗しました。プロンプトを変更してお試しください。',
      debug: text || 'No response from Gemini',
    };
  } catch (err) {
    return {
      error: `Gemini API Error: ${err.message}`,
    };
  }
}

// ── Return Ideas Generation ──
export async function generateReturnIdeas(input) {
  const genai = getAI();
  const axis = input.axis || 'koto';
  const axisLabels = { koto: 'コト（体験・サービス）', mono: 'モノ（商品・グッズ）', omoi: '想い（応援・共感）' };
  const axisLabel = axisLabels[axis] || axisLabels.koto;

  const prompt = `あなたはクラウドファンディングのリターン設計の専門家です。
以下のプロジェクトについて、「${axisLabel}」軸のリターンアイデアを5つ提案してください。

プロジェクト名: ${input.project_name || '未設定'}
プロジェクト概要: ${input.project_description || ''}
目標金額: ¥${(input.target_amount || 1000000).toLocaleString()}

${input.existing_ideas?.length > 0 ? `既存アイデア（重複しないように）:\n${input.existing_ideas.map(i => `- ${i}`).join('\n')}` : ''}

JSON形式で返答してください:
{
  "ideas": ["アイデア1", "アイデア2", "アイデア3", "アイデア4", "アイデア5"]
}`;

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)
      ?.map(p => p.text)
      ?.join('\n') || '';

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    return JSON.parse(jsonMatch[1].trim());
  } catch (err) {
    return { ideas: [], error: err.message };
  }
}

// ── Return Package Generation ──
export async function generateReturnPackages(input) {
  const genai = getAI();

  const prompt = `あなたはクラウドファンディングのリターン設計の専門家です。
以下のアイデアから、魅力的なリターンパッケージを4つ提案してください。

プロジェクト名: ${input.project_name || '未設定'}
プロジェクト概要: ${input.project_description || ''}
目標金額: ¥${(input.target_amount || 1000000).toLocaleString()}

リターンアイデア候補:
${(input.ideas || []).map(i => `- ${typeof i === 'string' ? i : JSON.stringify(i)}`).join('\n')}

価格帯:
${(input.price_tiers || []).map(t => `- ${t.label} (${t.tag})`).join('\n')}

各パッケージには以下を含めてください:
- name: パッケージ名
- price: 価格（数値）
- description: 一文の説明
- items: 含まれるリターン内容のリスト
- limit: 限定数（nullの場合は無制限）

JSON形式で返答してください:
{
  "packages": [
    {
      "name": "パッケージ名",
      "price": 5000,
      "description": "説明",
      "items": ["リターン1", "リターン2"],
      "limit": 100
    }
  ]
}`;

  try {
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.candidates?.[0]?.content?.parts
      ?.filter(p => p.text)
      ?.map(p => p.text)
      ?.join('\n') || '';

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    return JSON.parse(jsonMatch[1].trim());
  } catch (err) {
    return { packages: [], error: err.message };
  }
}

// ── Task Router ──
export async function handleGeminiTask(task) {
  switch (task.task_type) {
    case 'generate_image':
      return await generateImage(task.input);
    case 'generate_returns':
      return await generateReturnIdeas(task.input);
    case 'expand_returns':
      return await generateReturnPackages(task.input);
    default:
      throw new Error(`Unknown Gemini task type: ${task.task_type}`);
  }
}
