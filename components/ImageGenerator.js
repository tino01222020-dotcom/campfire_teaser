'use client';
import { useState, useEffect } from 'react';

/**
 * 画像生成コンポーネント — CrowdIgnite AI から移植
 * Gemini Image API (Worker経由) で6スタイルの画像を生成
 * タスクキュー方式: POST → Polling → 結果表示
 */

const IMAGE_STYLES = [
  { id: 'MANGA', label: 'マンガ風', icon: '📖', desc: '日本のマンガ調イラスト', prompt_hint: 'manga-style illustration, Japanese comic art style' },
  { id: 'REALISTIC', label: 'リアル写真風', icon: '📷', desc: '実写に近いフォトリアル', prompt_hint: 'photorealistic, professional photography style' },
  { id: 'ILLUSTRATION', label: 'イラスト', icon: '🎨', desc: '温かみのあるイラスト', prompt_hint: 'warm illustration style, hand-drawn feel' },
  { id: 'IMPACT_TEXT', label: 'インパクトテキスト', icon: '💥', desc: 'テキスト入りのインパクト画像', prompt_hint: 'bold impact text overlay, eye-catching design' },
  { id: 'FLYER', label: 'フライヤー風', icon: '📄', desc: 'チラシ・フライヤーデザイン', prompt_hint: 'flyer design, professional layout with text areas' },
  { id: 'SNS_POP', label: 'SNS投稿用', icon: '📱', desc: 'SNS映えするポップな画像', prompt_hint: 'social media post, vibrant colors, eye-catching' },
];

export default function ImageGenerator({ V, projectName = '', projectDescription = '' }) {
  const [selectedStyle, setSelectedStyle] = useState('MANGA');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  // Poll for task completion
  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/ai-tasks?status=completed&limit=20`);
        const data = await res.json();
        const task = (data.tasks || []).find(t => t.id === taskId);
        if (task && !cancelled) {
          setGenerating(false);
          setTaskId(null);
          if (task.result?.image_url || task.result?.image_base64) {
            setResult(task.result);
            setHistory(prev => [{ style: selectedStyle, prompt, result: task.result, timestamp: new Date().toISOString() }, ...prev.slice(0, 9)]);
          } else if (task.result?.error) {
            setError(task.result.error);
          }
        }
      } catch { /* retry next cycle */ }
    };
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [taskId]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setResult(null);

    try {
      const style = IMAGE_STYLES.find(s => s.id === selectedStyle);
      const res = await fetch('/api/ai-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'generate_image',
          input: {
            prompt: prompt,
            style: selectedStyle,
            style_hint: style?.prompt_hint || '',
            project_name: projectName,
            project_description: projectDescription,
          }
        })
      });
      const data = await res.json();
      if (data.task?.id) {
        setTaskId(data.task.id);
      } else {
        throw new Error(data.error || '画像生成タスクの作成に失敗しました');
      }
    } catch (err) {
      setError(err.message);
      setGenerating(false);
    }
  };

  const sectionStyle = { background: V.surface, borderRadius: V.radius, border: `1px solid ${V.border}`, padding: '24px', marginBottom: '16px' };

  return (
    <div style={{ fontFamily: V.fontSans, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: `${V.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🎨</div>
        <div>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: V.textStrong }}>クリエイティブ画像生成</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: V.textSub, lineHeight: 1.6 }}>
            プロジェクトに最適なクリエイティブ画像を6つのスタイルからAI生成。SNS・広告・LP用の素材を簡単に作成できます。
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px' }}>
        {/* Left: Style Selection */}
        <div>
          <div style={sectionStyle}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: V.textStrong }}>スタイル選択</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {IMAGE_STYLES.map(style => {
                const active = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '12px',
                      borderRadius: V.radiusSm, cursor: 'pointer', textAlign: 'left', fontFamily: V.fontSans,
                      border: active ? `2px solid ${V.accent}` : `2px solid ${V.border}`,
                      background: active ? `${V.accent}08` : V.surface,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{style.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: active ? V.accent : V.textStrong }}>{style.label}</div>
                      <div style={{ fontSize: '10px', color: V.textMuted, marginTop: '2px' }}>{style.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Prompt & Result */}
        <div>
          {/* Prompt Input */}
          <div style={sectionStyle}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: V.textStrong }}>プロンプト入力</h4>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="例: 環境に優しいエコバッグを使っている若い女性。自然の中で笑顔。明るく温かみのある雰囲気。"
              style={{
                width: '100%', boxSizing: 'border-box', minHeight: 100, padding: '12px',
                border: `2px solid ${V.border}`, borderRadius: V.radiusSm, fontSize: '14px',
                fontFamily: V.fontSans, color: V.textStrong, background: V.surfaceAlt,
                resize: 'vertical', outline: 'none', lineHeight: 1.7,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <div style={{ fontSize: '11px', color: V.textMuted }}>
                💡 具体的に描写するほど、良い結果が得られます
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                style={{
                  padding: '10px 24px', borderRadius: V.radiusSm, border: 'none', cursor: generating ? 'wait' : 'pointer',
                  background: generating ? V.disabled : `linear-gradient(135deg, ${V.accent}, #DC2626)`,
                  color: '#fff', fontSize: '14px', fontWeight: 800, fontFamily: V.fontSans,
                  opacity: !prompt.trim() ? 0.5 : 1, transition: 'all 0.2s',
                }}
              >
                {generating ? '⏳ 生成中...' : '✨ 画像を生成'}
              </button>
            </div>
          </div>

          {/* Loading State */}
          {generating && (
            <div style={{ ...sectionStyle, textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>🎨</div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: V.textStrong, margin: '0 0 4px' }}>画像を生成中...</p>
              <p style={{ fontSize: '12px', color: V.textMuted, margin: 0 }}>Gemini AIが画像を作成しています。30秒〜1分程度お待ちください。</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ ...sectionStyle, background: V.errorLight, borderColor: `${V.error}30` }}>
              <p style={{ margin: 0, fontSize: '13px', color: V.error, fontWeight: 700 }}>⚠️ {error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={sectionStyle}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: V.textStrong }}>生成結果</h4>
              <div style={{
                borderRadius: V.radiusSm, overflow: 'hidden', border: `1px solid ${V.border}`,
                background: V.surfaceAlt, display: 'flex', justifyContent: 'center', alignItems: 'center',
                minHeight: 300,
              }}>
                {result.image_base64 ? (
                  <img
                    src={`data:image/png;base64,${result.image_base64}`}
                    alt="生成画像"
                    style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }}
                  />
                ) : result.image_url ? (
                  <img
                    src={result.image_url}
                    alt="生成画像"
                    style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }}
                  />
                ) : (
                  <p style={{ color: V.textMuted, fontSize: '13px' }}>画像データが見つかりません</p>
                )}
              </div>
              {result.revised_prompt && (
                <div style={{ marginTop: '12px', padding: '10px 12px', background: V.surfaceAlt, borderRadius: V.radiusSm, fontSize: '11px', color: V.textMuted }}>
                  <strong>使用プロンプト:</strong> {result.revised_prompt}
                </div>
              )}
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div style={sectionStyle}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: V.textStrong }}>生成履歴</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {history.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => setResult(item.result)}
                    style={{
                      borderRadius: V.radiusSm, overflow: 'hidden', border: `1px solid ${V.border}`,
                      cursor: 'pointer', transition: 'border-color 0.2s',
                    }}
                  >
                    {item.result.image_base64 ? (
                      <img src={`data:image/png;base64,${item.result.image_base64}`} alt="" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                    ) : item.result.image_url ? (
                      <img src={item.result.image_url} alt="" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                    ) : null}
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: V.textStrong }}>
                        {IMAGE_STYLES.find(s => s.id === item.style)?.label || item.style}
                      </div>
                      <div style={{ fontSize: '9px', color: V.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.prompt}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}
