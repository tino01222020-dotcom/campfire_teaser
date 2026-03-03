'use client';
import { useState } from 'react';

/**
 * 集客ロードマップ — CrowdIgnite AI から移植
 * ゲーミフィケーション付きチェックリスト (Lv.1-6)
 * お気に入り登録数モニタリング付き
 */

const ROADMAP_ACTIONS = [
  { id: 'pre_sns_announce', label: 'SNSでの事前告知', phase: '公開前', tag: 'SNS告知', optional: false },
  { id: 'pre_2weeks', label: '公開2週間前からのSNSカウントダウン開始', phase: '公開前', tag: 'SNS告知', note: '★毎日投稿が重要！', optional: false },
  { id: 'pre_dm', label: '知人への個別メッセージ送信 or 直接会って説明', phase: '公開前', tag: '知人への告知', optional: false },
  { id: 'pre_existing', label: '既存顧客へのLINE/メルマガなどでのアプローチ', phase: '公開前', tag: '知人への告知', optional: false },
  { id: 'pre_ad', label: 'CAMPFIRE広告の実施', phase: '公開前', tag: '広告での認知拡大', note: '※任意', optional: true },
  { id: 'pre_media', label: 'メディアアプローチ', phase: '公開前', tag: 'メディアでの認知拡大', note: '※任意', optional: true },
  { id: 'launch_sns', label: '公開1週間のSNSでの盛り上がり演出', phase: '公開初期', tag: 'SNSでの継続発信', note: '★毎日投稿が重要！', optional: false },
  { id: 'launch_activity', label: 'CAMPFIRE活動報告の投稿', phase: '公開初期', tag: '活動報告', note: '※お気に入り登録/支援ユーザーに状況を伝えられます', optional: false },
  { id: 'mid_campaign', label: '中盤のSNSキャンペーン企画', phase: '公開中盤', tag: 'SNSでの継続発信', note: '※任意', optional: true },
  { id: 'mid_return', label: '追加リターン発表', phase: '公開中盤', tag: 'SNSでの継続発信', note: '※任意', optional: true },
  { id: 'final_countdown', label: '終了1週間前からカウントダウン投稿開始', phase: 'ラストスパート', tag: 'SNSでの継続発信', note: '★毎日投稿が重要！', optional: false },
];

const LEVEL_NAMES = ['ビギナー', 'ルーキー', 'チャレンジャー', 'プロフェッショナル', 'マスター', 'レジェンド'];

const ENCOURAGEMENTS = [
  "素晴らしい一歩ですね！この調子で進めていきましょう。",
  "着実に前進しています！あなたの努力が成功を引き寄せます。",
  "お疲れ様です！一つ一つクリアしていく姿、とても素敵です。",
  "ナイスアクション！集客の土台がどんどん固まっていますね。",
  "すごい！この調子で、夢の実現に向けて走り抜けましょう！",
  "一歩ずつ、確実に。あなたの想いはきっと届きますよ。"
];

export default function CustomerRoadmap({ V, targetAmount = 1000000 }) {
  const [completed, setCompleted] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [favorites, setFavorites] = useState(0);
  const [showMsg, setShowMsg] = useState('');

  const favoriteGoal = Math.floor(targetAmount / 10000 * 3);
  const favProgress = Math.min(100, Math.floor((favorites / Math.max(favoriteGoal, 1)) * 100));

  const requiredActions = ROADMAP_ACTIONS.filter(a => !a.optional);
  const processedCount = requiredActions.filter(a => completed.includes(a.id) || skipped.includes(a.id)).length;
  const progress = Math.floor((processedCount / requiredActions.length) * 100);
  const level = Math.min(6, Math.floor(progress / 20) + 1);

  const toggleComplete = (id) => {
    setSkipped(p => p.filter(x => x !== id));
    setCompleted(p => {
      const isNew = !p.includes(id);
      if (isNew) {
        const msg = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
        setShowMsg(msg);
        setTimeout(() => setShowMsg(''), 3000);
      }
      return isNew ? [...p, id] : p.filter(x => x !== id);
    });
  };

  const toggleSkip = (id) => {
    setCompleted(p => p.filter(x => x !== id));
    setSkipped(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const sectionStyle = { background: V.surface, borderRadius: V.radius, border: `1px solid ${V.border}`, padding: '24px', marginBottom: '16px' };
  const phases = [...new Set(ROADMAP_ACTIONS.map(a => a.phase))];
  const phaseColors = { '公開前': V.green, '公開初期': V.accent, '公開中盤': V.link, 'ラストスパート': V.error };

  return (
    <div style={{ fontFamily: V.fontSans, maxWidth: 900, margin: '0 auto' }}>
      {/* Encouragement Popup */}
      {showMsg && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          background: V.surface, border: `1px solid ${V.green}20`, padding: '12px 24px',
          borderRadius: V.radius, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeIn 0.3s ease'
        }}>
          <span style={{ fontSize: '20px' }}>✨</span>
          <span style={{ fontWeight: 800, color: V.textStrong, fontSize: '14px' }}>{showMsg}</span>
        </div>
      )}

      {/* Intro */}
      <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: `${V.link}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🤖</div>
        <div>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: V.textStrong }}>集客ロードマップへようこそ！</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: V.textSub, lineHeight: 1.6 }}>
            PV数とお気に入り登録数を最大化するために、公開前〜公開後にやるべきアクションを網羅しています。一つずつチェックを入れながら準備を進めましょう！
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px' }}>
        {/* Left: Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Level Card */}
          <div style={{
            background: `linear-gradient(135deg, ${V.link} 0%, #7C3AED 100%)`,
            borderRadius: V.radius, padding: '24px', color: '#fff', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '80px', opacity: 0.1 }}>🏆</div>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.7, marginBottom: '8px' }}>集客ランク</div>
            <div style={{ fontSize: '22px', fontWeight: 900 }}>Lv.{level} {LEVEL_NAMES[level - 1]}</div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #FBBF24, #F97316)', borderRadius: 3, width: `${progress}%`, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '6px' }}>
              実施率 {progress}%！{level < 6 ? `次まであと ${20 - (progress % 20)}%` : '最高ランク！'}
            </div>
          </div>

          {/* Favorites Monitor */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '18px' }}>❤️</span>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: V.textStrong }}>お気に入り登録数</h4>
            </div>
            <input
              type="number" value={favorites} onChange={e => setFavorites(Number(e.target.value))}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px', border: `2px solid ${V.border}`,
                borderRadius: V.radiusSm, fontSize: '28px', fontWeight: 900, color: V.textStrong,
                textAlign: 'center', fontFamily: V.fontSans, background: V.surfaceAlt, outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
              <span style={{ fontWeight: 700, color: V.textMuted }}>目標: {favoriteGoal.toLocaleString()}人</span>
              <span style={{ fontWeight: 800, color: V.accent }}>{favProgress}%</span>
            </div>
            <div style={{ height: 6, background: V.surfaceAlt, borderRadius: 3, marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: `linear-gradient(90deg, ${V.accent}, #DC2626)`, borderRadius: 3, width: `${favProgress}%`, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: '10px', color: V.textMuted, marginTop: '8px', lineHeight: 1.5 }}>
              💡 お気に入り登録数 = 公開初日の支援者数の先行指標。目標金額の3倍（万円換算）を目安に集めましょう。
            </div>
          </div>
        </div>

        {/* Right: Checklist */}
        <div>
          {phases.map(phase => {
            const actions = ROADMAP_ACTIONS.filter(a => a.phase === phase);
            const phaseColor = phaseColors[phase] || V.link;
            return (
              <div key={phase} style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
                  padding: '8px 12px', background: `${phaseColor}10`, borderRadius: V.radiusSm, borderLeft: `4px solid ${phaseColor}`
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: phaseColor }}>{phase}</span>
                  <span style={{ fontSize: '11px', color: V.textMuted }}>
                    {actions.filter(a => completed.includes(a.id)).length}/{actions.length} 完了
                  </span>
                </div>
                {actions.map(action => {
                  const isDone = completed.includes(action.id);
                  const isSkip = skipped.includes(action.id);
                  return (
                    <div key={action.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                      background: isDone ? `${V.green}08` : isSkip ? `${V.textMuted}08` : V.surface,
                      borderRadius: V.radiusSm, marginBottom: '6px', border: `1px solid ${isDone ? V.green + '30' : V.border}`,
                      transition: 'all 0.2s'
                    }}>
                      {/* Check button */}
                      <button
                        onClick={() => toggleComplete(action.id)}
                        style={{
                          width: 24, height: 24, borderRadius: 6, border: `2px solid ${isDone ? V.green : V.border}`,
                          background: isDone ? V.green : 'transparent', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s'
                        }}
                      >
                        {isDone && <span style={{ color: '#fff', fontSize: '14px', fontWeight: 900 }}>✓</span>}
                      </button>
                      {/* Content */}
                      <div style={{ flex: 1, opacity: isSkip ? 0.4 : 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: V.textStrong, textDecoration: isSkip ? 'line-through' : 'none' }}>
                          {action.label}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: phaseColor, background: `${phaseColor}15`, padding: '1px 6px', borderRadius: 4 }}>
                            {action.tag}
                          </span>
                          {action.note && <span style={{ fontSize: '10px', color: V.textMuted }}>{action.note}</span>}
                          {action.optional && <span style={{ fontSize: '9px', fontWeight: 700, color: V.textMuted, background: V.surfaceAlt, padding: '1px 6px', borderRadius: 4 }}>任意</span>}
                        </div>
                      </div>
                      {/* Skip button */}
                      {action.optional && (
                        <button
                          onClick={() => toggleSkip(action.id)}
                          style={{
                            padding: '4px 8px', fontSize: '10px', fontWeight: 700,
                            color: isSkip ? V.accent : V.textMuted, background: 'transparent',
                            border: `1px solid ${isSkip ? V.accent : V.border}`, borderRadius: 6, cursor: 'pointer'
                          }}
                        >
                          {isSkip ? '戻す' : 'スキップ'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
