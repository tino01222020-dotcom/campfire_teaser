'use client';
import { useState, useEffect } from 'react';

/**
 * リターン設計シミュレーター — CrowdIgnite AI から移植
 * 3軸（コト・モノ・想い）のリターンアイデア生成 + パッケージ提案
 * AI生成はWorkerタスクキュー経由
 */

const AXIS_CONFIG = [
  { id: 'koto', label: 'コト軸', icon: '🎭', color: '#8B5CF6', desc: '体験・イベント・サービス', examples: ['限定ワークショップ参加券', 'オンライン交流会', '先行体験会'] },
  { id: 'mono', label: 'モノ軸', icon: '🎁', color: '#F97316', desc: '商品・グッズ・物理的リターン', examples: ['限定カラー商品', 'シリアルナンバー入り', '名入れカスタム'] },
  { id: 'omoi', label: '想い軸', icon: '💝', color: '#EC4899', desc: '応援・共感・ストーリー参加', examples: ['お名前掲載', '開発ストーリー共有', 'サンクスレター'] },
];

const PRICE_TIERS = [
  { label: '¥1,000〜3,000', range: [1000, 3000], tag: 'お気持ち支援' },
  { label: '¥5,000〜10,000', range: [5000, 10000], tag: '標準リターン' },
  { label: '¥15,000〜30,000', range: [15000, 30000], tag: 'プレミアム' },
  { label: '¥50,000〜', range: [50000, 100000], tag: 'VIP' },
];

export default function ReturnDesigner({ V, projectName = '', projectDescription = '', targetAmount = 1000000 }) {
  const [ideas, setIdeas] = useState({ koto: [], mono: [], omoi: [] });
  const [packages, setPackages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genAxis, setGenAxis] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [manualAxis, setManualAxis] = useState('koto');
  const [selectedIdeas, setSelectedIdeas] = useState([]);
  const [genPackages, setGenPackages] = useState(false);
  const [packageTaskId, setPackageTaskId] = useState(null);

  // Poll for task result
  useEffect(() => {
    const activeTaskId = taskId || packageTaskId;
    if (!activeTaskId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/ai-tasks?status=completed&limit=20`);
        const data = await res.json();
        const task = (data.tasks || []).find(t => t.id === activeTaskId);
        if (task && !cancelled) {
          if (taskId === activeTaskId) {
            setTaskId(null);
            setGenerating(false);
            if (task.result?.ideas) {
              setIdeas(prev => {
                const axis = genAxis || 'koto';
                return { ...prev, [axis]: [...prev[axis], ...task.result.ideas] };
              });
            }
          }
          if (packageTaskId === activeTaskId) {
            setPackageTaskId(null);
            setGenPackages(false);
            if (task.result?.packages) {
              setPackages(task.result.packages);
            }
          }
        }
      } catch { /* retry */ }
    };
    const interval = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [taskId, packageTaskId, genAxis]);

  const handleGenerateIdeas = async (axis) => {
    setGenerating(true);
    setGenAxis(axis);
    try {
      const res = await fetch('/api/ai-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'generate_returns',
          input: {
            axis,
            project_name: projectName,
            project_description: projectDescription,
            target_amount: targetAmount,
            existing_ideas: ideas[axis],
          }
        })
      });
      const data = await res.json();
      if (data.task?.id) {
        setTaskId(data.task.id);
      } else {
        setGenerating(false);
      }
    } catch {
      setGenerating(false);
    }
  };

  const handleGeneratePackages = async () => {
    setGenPackages(true);
    try {
      const allIdeas = [...ideas.koto, ...ideas.mono, ...ideas.omoi, ...selectedIdeas.map(id => {
        for (const axis of Object.keys(ideas)) {
          const found = ideas[axis].find((_, i) => `${axis}-${i}` === id);
          if (found) return found;
        }
        return null;
      }).filter(Boolean)];

      const res = await fetch('/api/ai-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'expand_returns',
          input: {
            project_name: projectName,
            project_description: projectDescription,
            target_amount: targetAmount,
            ideas: allIdeas,
            price_tiers: PRICE_TIERS,
          }
        })
      });
      const data = await res.json();
      if (data.task?.id) {
        setPackageTaskId(data.task.id);
      } else {
        setGenPackages(false);
      }
    } catch {
      setGenPackages(false);
    }
  };

  const addManualIdea = () => {
    if (!manualInput.trim()) return;
    setIdeas(prev => ({ ...prev, [manualAxis]: [...prev[manualAxis], manualInput.trim()] }));
    setManualInput('');
  };

  const toggleSelect = (id) => {
    setSelectedIdeas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const totalIdeas = ideas.koto.length + ideas.mono.length + ideas.omoi.length;

  const sectionStyle = { background: V.surface, borderRadius: V.radius, border: `1px solid ${V.border}`, padding: '24px', marginBottom: '16px' };

  return (
    <div style={{ fontFamily: V.fontSans, maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: `${V.link}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🎁</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: V.textStrong }}>リターン設計シミュレーター</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: V.textSub, lineHeight: 1.6 }}>
            3つの軸（コト・モノ・想い）でリターンアイデアをAI生成し、最適な価格帯パッケージを自動提案します。
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, color: V.textStrong }}>{totalIdeas}</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: V.textMuted }}>アイデア数</div>
        </div>
      </div>

      {/* 3-Axis Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {AXIS_CONFIG.map(axis => (
          <div key={axis.id} style={{
            ...sectionStyle, marginBottom: 0, borderTop: `4px solid ${axis.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>{axis.icon}</span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: axis.color }}>{axis.label}</div>
                <div style={{ fontSize: '10px', color: V.textMuted }}>{axis.desc}</div>
              </div>
            </div>

            {/* Existing ideas */}
            {ideas[axis.id].length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                {ideas[axis.id].map((idea, i) => {
                  const id = `${axis.id}-${i}`;
                  const selected = selectedIdeas.includes(id);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleSelect(id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                        borderRadius: V.radiusSm, marginBottom: '4px', cursor: 'pointer',
                        background: selected ? `${axis.color}10` : V.surfaceAlt,
                        border: `1px solid ${selected ? axis.color + '40' : V.border}`,
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${selected ? axis.color : V.border}`,
                        background: selected ? axis.color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: V.textStrong }}>{idea}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Examples */}
            {ideas[axis.id].length === 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: V.textMuted, marginBottom: '4px' }}>例:</div>
                {axis.examples.map((ex, i) => (
                  <div key={i} style={{ fontSize: '11px', color: V.textSub, padding: '3px 0' }}>• {ex}</div>
                ))}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={() => handleGenerateIdeas(axis.id)}
              disabled={generating}
              style={{
                width: '100%', padding: '10px', borderRadius: V.radiusSm, border: `1px solid ${axis.color}30`,
                background: generating && genAxis === axis.id ? V.disabled : `${axis.color}10`,
                color: axis.color, fontSize: '12px', fontWeight: 700, cursor: generating ? 'wait' : 'pointer',
                fontFamily: V.fontSans, transition: 'all 0.2s',
              }}
            >
              {generating && genAxis === axis.id ? '⏳ 生成中...' : `✨ ${axis.label}アイデアを生成`}
            </button>
          </div>
        ))}
      </div>

      {/* Manual Input */}
      <div style={sectionStyle}>
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: V.textStrong }}>手動でアイデアを追加</h4>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={manualAxis}
            onChange={e => setManualAxis(e.target.value)}
            style={{
              padding: '10px 12px', borderRadius: V.radiusSm, border: `1px solid ${V.border}`,
              fontSize: '13px', fontWeight: 700, color: V.textStrong, fontFamily: V.fontSans,
              background: V.surfaceAlt, cursor: 'pointer',
            }}
          >
            {AXIS_CONFIG.map(a => <option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
          </select>
          <input
            type="text"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addManualIdea()}
            placeholder="リターンアイデアを入力..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: V.radiusSm, border: `1px solid ${V.border}`,
              fontSize: '13px', color: V.textStrong, fontFamily: V.fontSans, outline: 'none',
            }}
          />
          <button
            onClick={addManualIdea}
            style={{
              padding: '10px 20px', borderRadius: V.radiusSm, border: 'none',
              background: V.link, color: '#fff', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: V.fontSans, whiteSpace: 'nowrap',
            }}
          >
            追加
          </button>
        </div>
      </div>

      {/* Package Generation */}
      {totalIdeas >= 3 && (
        <div style={{
          ...sectionStyle,
          background: `linear-gradient(135deg, ${V.link}08, ${V.accent}08)`,
          borderColor: `${V.link}30`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: V.textStrong }}>🎯 パッケージ自動生成</h4>
              <p style={{ margin: 0, fontSize: '12px', color: V.textSub }}>
                {totalIdeas}個のアイデアから最適な価格帯パッケージを自動提案します
              </p>
            </div>
            <button
              onClick={handleGeneratePackages}
              disabled={genPackages}
              style={{
                padding: '12px 28px', borderRadius: V.radiusSm, border: 'none',
                background: genPackages ? V.disabled : `linear-gradient(135deg, ${V.link}, #7C3AED)`,
                color: '#fff', fontSize: '14px', fontWeight: 800, cursor: genPackages ? 'wait' : 'pointer',
                fontFamily: V.fontSans,
              }}
            >
              {genPackages ? '⏳ 生成中...' : '🚀 パッケージを生成'}
            </button>
          </div>
        </div>
      )}

      {/* Package Results */}
      {packages.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {packages.map((pkg, i) => (
            <div key={i} style={{
              ...sectionStyle, marginBottom: 0,
              borderTop: `3px solid ${AXIS_CONFIG[i % 3].color}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: V.textStrong }}>{pkg.name || `パッケージ ${i + 1}`}</div>
                  <div style={{ fontSize: '11px', color: V.textMuted, marginTop: '2px' }}>{pkg.description || ''}</div>
                </div>
                <div style={{
                  fontSize: '16px', fontWeight: 900, color: V.accent,
                  background: `${V.accent}10`, padding: '4px 12px', borderRadius: V.radiusSm,
                }}>
                  ¥{(pkg.price || 0).toLocaleString()}
                </div>
              </div>
              {pkg.items && pkg.items.map((item, j) => (
                <div key={j} style={{ fontSize: '12px', color: V.textSub, padding: '4px 0', borderBottom: j < pkg.items.length - 1 ? `1px solid ${V.border}` : 'none' }}>
                  ✦ {item}
                </div>
              ))}
              {pkg.limit && (
                <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 700, color: V.accent }}>
                  限定 {pkg.limit}個
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      <div style={{ marginTop: '16px', padding: '12px 16px', background: V.surfaceAlt, borderRadius: V.radiusSm, fontSize: '10px', color: V.textMuted, lineHeight: 1.6 }}>
        💡 リターンは3〜5種類が最適。価格帯は¥3,000・¥10,000・¥30,000の3段階をカバーすると支援者の幅が広がります。
      </div>
    </div>
  );
}
