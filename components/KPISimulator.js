'use client';
import { useState } from 'react';

/**
 * KPIシミュレーター — CrowdIgnite AI から移植
 * 目標金額から必要リード数/UU数/広告予算を自動算出
 * 公開前/公開後シナリオ別（CVR・CPL・CPC変動）
 * 純粋なJS計算、AI不要
 */
export default function KPISimulator({ V, phase }) {
  const [targetAmount, setTargetAmount] = useState(1000000);
  const [scenario, setScenario] = useState('good'); // 'good' | 'bad'
  const [preLaunchEnabled, setPreLaunchEnabled] = useState(true);
  const [otherLeads, setOtherLeads] = useState(0);
  const [otherUU, setOtherUU] = useState(0);

  // ── Pre-Launch Calculation ──
  const preLaunchTarget = targetAmount * 0.3;
  const preAvgUnit = 20000;
  const preCVR = scenario === 'good' ? 0.15 : 0.05;
  const preTotalLeads = Math.ceil(preLaunchTarget / preAvgUnit / preCVR);
  const preCampfireLeads = Math.max(0, preTotalLeads - otherLeads);
  const preCPL = scenario === 'good' ? 500 : 1200;
  const preBudget = preCampfireLeads * preCPL;

  // ── Post-Launch Calculation ──
  const postTarget = targetAmount * (preLaunchEnabled ? 0.7 : 1.0);
  const postAvgUnit = 20000;
  const postCVR = scenario === 'good' ? 0.03 : 0.01;
  const postTotalUU = Math.ceil(postTarget / postAvgUnit / postCVR);
  const postCampfireUU = Math.max(0, postTotalUU - otherUU);
  const postCPC = scenario === 'good' ? 80 : 150;
  const postBudget = postCampfireUU * postCPC;

  const totalBudget = (preLaunchEnabled ? preBudget : 0) + postBudget;

  const fmtNum = (n) => n.toLocaleString();

  const sectionStyle = {
    background: V.surface, borderRadius: V.radius, border: `1px solid ${V.border}`,
    padding: '28px', marginBottom: '20px'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 700, color: V.textSub, marginBottom: '6px' };
  const bigNum = { fontSize: '28px', fontWeight: 800, color: V.textStrong };
  const statBox = { background: V.surfaceAlt, borderRadius: V.radiusSm, padding: '16px', border: `1px solid ${V.border}` };

  return (
    <div style={{ fontFamily: V.fontSans }}>
      {/* Header */}
      <div style={{ ...sectionStyle, background: `linear-gradient(135deg, ${V.accent}08 0%, ${V.surface} 100%)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${V.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📊</div>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: V.textStrong }}>広告予算シミュレーション</h3>
            <p style={{ margin: 0, fontSize: '13px', color: V.textSub }}>目標金額から必要な広告予算を自動算出します</p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Target Amount */}
          <div>
            <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: V.accent, color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: '11px', fontWeight: 800 }}>1</span>
              目標金額を設定
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '12px 50px 12px 16px',
                  border: `2px solid ${V.border}`, borderRadius: V.radiusSm, fontSize: '22px',
                  fontWeight: 800, color: V.textStrong, outline: 'none', fontFamily: V.fontSans,
                  background: V.surface
                }}
              />
              <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: V.textSub, fontSize: '14px' }}>円</span>
            </div>
          </div>

          {/* Scenario */}
          <div>
            <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ background: V.accent, color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: '11px', fontWeight: 800 }}>2</span>
              シミュレーション条件
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'good', label: '効果が良い場合', sub: 'CVR高め / CPL低め', color: V.green },
                { id: 'bad', label: '効果が悪い場合', sub: 'CVR低め / CPL高め', color: V.textStrong },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: V.radiusSm, cursor: 'pointer',
                    border: scenario === s.id ? `2px solid ${s.color}` : `2px solid ${V.border}`,
                    background: scenario === s.id ? `${s.color}10` : V.surface,
                    textAlign: 'center', fontFamily: V.fontSans,
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: scenario === s.id ? s.color : V.textSub }}>{s.label}</div>
                  <div style={{ fontSize: '10px', color: V.textMuted, marginTop: '2px' }}>{s.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pre-Launch Toggle */}
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: V.surfaceAlt, borderRadius: V.radiusSm, border: `1px solid ${V.border}` }}>
          <button
            onClick={() => setPreLaunchEnabled(!preLaunchEnabled)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: preLaunchEnabled ? V.green : V.disabled, position: 'relative', transition: 'background 0.2s'
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', position: 'absolute', top: 3, left: preLaunchEnabled ? 23 : 3, transition: 'left 0.2s' }} />
          </button>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: V.textStrong }}>公開前配信を実施する</div>
            <div style={{ fontSize: '10px', color: V.textMuted }}>公開前配信（ティザー広告）で初動の爆発力を高められます</div>
          </div>
        </div>
      </div>

      {/* Total Budget Card */}
      <div style={{
        ...sectionStyle,
        background: `linear-gradient(135deg, ${V.accent} 0%, #DC2626 100%)`,
        color: '#fff', textAlign: 'center', padding: '32px'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>推奨広告予算 合計</div>
        <div style={{ fontSize: '36px', fontWeight: 900, marginTop: '8px' }}>¥{fmtNum(totalBudget)}</div>
        <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
          公開前: ¥{fmtNum(preLaunchEnabled ? preBudget : 0)} + 公開後: ¥{fmtNum(postBudget)}
        </div>
      </div>

      {/* Two-column simulation results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Pre-Launch */}
        <div style={{ ...sectionStyle, opacity: preLaunchEnabled ? 1 : 0.4, pointerEvents: preLaunchEnabled ? 'auto' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px' }}>⏰</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: V.textStrong }}>公開前シミュレーション</h4>
              <p style={{ margin: 0, fontSize: '11px', color: V.textSub }}>目標額の30%（¥{fmtNum(Math.round(preLaunchTarget))}）を広告で獲得</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={statBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: V.textSub }}>必要リード総数</span>
                <span style={{ ...bigNum, fontSize: '18px' }}>{fmtNum(preTotalLeads)} 件</span>
              </div>
            </div>
            <div style={statBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: V.textSub }}>その他（SNS等）</span>
                <input type="number" value={otherLeads} onChange={e => setOtherLeads(Number(e.target.value))}
                  style={{ width: 80, textAlign: 'right', padding: '4px 8px', border: `1px solid ${V.border}`, borderRadius: 6, fontSize: '13px', fontWeight: 700, fontFamily: V.fontSans }} />
              </div>
            </div>
            <div style={{ ...statBox, borderColor: V.green }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: V.green }}>CAMPFIRE広告で獲得</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: V.green }}>{fmtNum(preCampfireLeads)} 件</span>
              </div>
            </div>
            <div style={{ background: V.green, borderRadius: V.radiusSm, padding: '16px', color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>推奨広告予算</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>¥{fmtNum(preBudget)}</div>
            </div>
          </div>

          {/* Logic */}
          <div style={{ marginTop: '16px', fontSize: '11px', color: V.textMuted }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Calculation Logic</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${V.border}` }}>
              <span>平均支援単価</span><span style={{ fontWeight: 700, color: V.textStrong }}>¥{fmtNum(preAvgUnit)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${V.border}` }}>
              <span>平均CVR</span><span style={{ fontWeight: 700, color: V.textStrong }}>{(preCVR * 100)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>想定CPL</span><span style={{ fontWeight: 700, color: V.textStrong }}>¥{fmtNum(preCPL)}</span>
            </div>
          </div>
        </div>

        {/* Post-Launch */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '16px' }}>📣</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: V.textStrong }}>公開後シミュレーション</h4>
              <p style={{ margin: 0, fontSize: '11px', color: V.textSub }}>目標額の{preLaunchEnabled ? '70' : '100'}%（¥{fmtNum(Math.round(postTarget))}）を広告で獲得</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={statBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: V.textSub }}>必要UU総数</span>
                <span style={{ ...bigNum, fontSize: '18px' }}>{fmtNum(postTotalUU)} 人</span>
              </div>
            </div>
            <div style={statBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: V.textSub }}>その他（SNS等）</span>
                <input type="number" value={otherUU} onChange={e => setOtherUU(Number(e.target.value))}
                  style={{ width: 80, textAlign: 'right', padding: '4px 8px', border: `1px solid ${V.border}`, borderRadius: 6, fontSize: '13px', fontWeight: 700, fontFamily: V.fontSans }} />
              </div>
            </div>
            <div style={{ ...statBox, borderColor: V.accent }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: V.accent }}>CAMPFIRE広告で獲得</span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: V.accent }}>{fmtNum(postCampfireUU)} 人</span>
              </div>
            </div>
            <div style={{ background: V.accent, borderRadius: V.radiusSm, padding: '16px', color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>推奨広告予算</div>
              <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>¥{fmtNum(postBudget)}</div>
            </div>
          </div>

          {/* Logic */}
          <div style={{ marginTop: '16px', fontSize: '11px', color: V.textMuted }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Calculation Logic</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${V.border}` }}>
              <span>平均支援単価</span><span style={{ fontWeight: 700, color: V.textStrong }}>¥{fmtNum(postAvgUnit)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${V.border}` }}>
              <span>平均CVR</span><span style={{ fontWeight: 700, color: V.textStrong }}>{(postCVR * 100)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span>想定CPC</span><span style={{ fontWeight: 700, color: V.textStrong }}>¥{fmtNum(postCPC)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Breakdown */}
      <div style={sectionStyle}>
        <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 800, color: V.textStrong }}>💡 予算配分の内訳案</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { name: 'WEB広告', price: '30万円〜', desc: 'Meta/Google広告等への配信費用' },
            { name: 'CAMPFIRE Ads ロイヤルプラン', price: '50万円', desc: 'CAMPFIRE内の上位広告枠' },
            { name: 'CAMPFIRE Ads スタンダードプラン', price: '30万円', desc: 'CAMPFIRE内の標準広告枠' },
            { name: 'CAMPFIRE Ads ライトプラン', price: '10万円', desc: 'CAMPFIRE内のお試し広告枠' },
          ].map(item => (
            <div key={item.name} style={statBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: V.textStrong }}>{item.name}</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: V.accent }}>{item.price}</span>
              </div>
              <p style={{ margin: 0, fontSize: '10px', color: V.textMuted }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 16px', background: V.surfaceAlt, borderRadius: V.radiusSm, fontSize: '10px', color: V.textMuted, lineHeight: 1.6 }}>
        ※本シミュレーションは、過去の類似プロジェクトの実績データをもとに算出した目安であり、実際の成果を保証するものではありません。市場環境やクリエイティブの質により変動します。
      </div>
    </div>
  );
}
