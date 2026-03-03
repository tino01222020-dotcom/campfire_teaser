'use client';
import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import KPISimulator from "./KPISimulator";
import CustomerRoadmap from "./CustomerRoadmap";
import ImageGenerator from "./ImageGenerator";
import ReturnDesigner from "./ReturnDesigner";

// ━━ CAMPFIRE Design Tokens (Source: campfire-all-color-tokens.csv) ━━
const bg = {
  base:'#F6F8FA', sub:'#F0F2F4', default:'#FFFFFF', disabled:'#E4E4E4',
  brand:'#EF4846', primaryRed:'#E65D65', primaryGreen:'#39C288',
  information:'rgba(57,194,136,0.1)', success:'#C0F2DC', checkoutPrimary:'#00C4AC',
  accent:'#FAC75A', attention:'#FEF5E1', alert:'#E13A43', alertWeak:'#FCEFF0',
  footer:'#393F48', secondaryPo:'#393F48', secondaryPa:'#4D4A4A', tag:'#BBBBBB',
};
const fg = {
  primaryStrong:'#110114', primary:'#4D4A4A', secondary:'#666666', tertiary:'#999999',
  disabled:'rgba(77,74,74,0.3)', link:'#307BF6', alert:'#E13A43',
  brand:'#EF4846', accent:'#FAC75A', inverse:'#FFFFFF',
};
const borderTokens = {
  default:'#D9DEE5', sub:'#E5E7EB', inset:'#F3F3F3', alert:'#E13A43',
  primary:'#EF4846', active:'#39C288', secondary:'#393F48', link:'#307BF6', inverse:'#FFFFFF',
};
const semantic = { success:bg.primaryGreen, successLight:bg.success, error:bg.alert, errorLight:bg.alertWeak, warning:bg.accent, warningLight:bg.attention, info:fg.link };
const font = { sans:"'DM Sans','Noto Sans JP',sans-serif", display:"'Outfit','DM Sans','Noto Sans JP',sans-serif", mono:"'IBM Plex Mono',monospace" };
const radius = { sm:8, md:12, lg:16, xl:20, full:9999 };
const phaseTokens = {
  lead:  { primary:bg.primaryGreen, primaryLight:bg.information, accent:borderTokens.active, label:'リード創出', sub:'先行登録フェーズ', icon:'◎', kpis:['CVR','CPL','リード数','CTA率'] },
  backer:{ primary:bg.brand, primaryLight:bg.alertWeak, accent:borderTokens.primary, label:'支援創出', sub:'クラファン実施フェーズ', icon:'⬡', kpis:['CVR','CPA','支援者数','支援額'] },
};

const PHASES = {
  lead: { id: "lead", ...phaseTokens.lead, color: phaseTokens.lead.primary, colorLight: phaseTokens.lead.primaryLight, description: "LP → 先行登録（LINE/Email）の獲得効率を最大化" },
  backer: { id: "backer", ...phaseTokens.backer, color: phaseTokens.backer.primary, colorLight: phaseTokens.backer.primaryLight, description: "広告 → クラファンページ → 支援完了の獲得効率を最大化" },
};

const PLATFORM_COLORS = { Facebook: "#1877F2", Google: "#EA4335", "X (Twitter)": fg.primaryStrong, Instagram: "#E4405F", "リターゲティング": fg.link };
// V: compat alias mapping to CAMPFIRE design tokens
const V = {
  bg: bg.base, surface: bg.default, surfaceAlt: bg.sub, border: borderTokens.default,
  text: fg.primary, textSub: fg.secondary, textMuted: fg.tertiary, textStrong: fg.primaryStrong,
  accent: bg.brand, accentLight: bg.alertWeak,
  green: semantic.success, greenLight: semantic.successLight, line: bg.primaryGreen,
  radius: radius.lg, radiusSm: radius.sm,
  error: semantic.error, errorLight: semantic.errorLight,
  warning: bg.accent, warningLight: bg.attention, warningText: '#D97706', warningDark: '#92400E',
  link: fg.link, inverse: fg.inverse,
  footer: bg.footer, disabled: bg.disabled,
  fontSans: font.sans, fontDisplay: font.display, fontMono: font.mono,
};

// ── Mock Data ──
const MOCK = {
  lead: {
    stats: [
      { label: "総リード数", value: "1,847", trend: "up", trendVal: "+12.3%", sub: "先週比" },
      { label: "CVR", value: "14.9%", trend: "up", trendVal: "+1.8pt", sub: "LP訪問→登録" },
      { label: "CPL", value: "¥172", trend: "down", trendVal: "-¥18", sub: "目標¥200以下" },
      { label: "CTA率", value: "32.4%", trend: "up", trendVal: "+3.1pt", sub: "ファーストビュー" },
    ],
    daily: Array.from({ length: 14 }, (_, i) => ({ date: `2/${i+14}`, line: Math.floor(Math.random()*25)+10, email: Math.floor(Math.random()*18)+5, cvr: (12+Math.random()*6).toFixed(1), cpl: Math.floor(160+Math.random()*40) })),
    ads: [
      { platform: "Facebook", spend: 45000, result: 262, efficiency: 172, rate: 16.2, status: "active", trend: "up" },
      { platform: "Google", spend: 38000, result: 186, efficiency: 204, rate: 12.8, status: "active", trend: "down" },
      { platform: "X (Twitter)", spend: 22000, result: 178, efficiency: 124, rate: 21.4, status: "active", trend: "up" },
      { platform: "Instagram", spend: 31000, result: 201, efficiency: 154, rate: 18.1, status: "paused", trend: "up" },
    ],
    funnel: [
      { name: "広告表示", value: 124000, rate: null }, { name: "LP訪問", value: 12400, rate: "10.0%" },
      { name: "CTA表示", value: 8200, rate: "66.1%" }, { name: "フォーム入力", value: 3100, rate: "37.8%" },
      { name: "登録完了", value: 1847, rate: "59.6%" },
    ],
    channels: [ { name: "LINE", value: 58, color: V.line }, { name: "Email", value: 32, color: "#F97316" }, { name: "Web直接", value: 10, color: "#8B5CF6" } ],
  },
  backer: {
    stats: [
      { label: "支援者数", value: "423", trend: "up", trendVal: "+34人/日", sub: "目標500人" },
      { label: "CVR", value: "4.2%", trend: "up", trendVal: "+0.6pt", sub: "広告→支援完了" },
      { label: "CPA", value: "¥2,840", trend: "down", trendVal: "-¥320", sub: "目標¥3,000以下" },
      { label: "支援総額", value: "¥4.23M", trend: "up", trendVal: "+¥580K/日", sub: "目標¥5M" },
    ],
    daily: Array.from({ length: 14 }, (_, i) => ({ date: `3/${i+1}`, backers: Math.floor(Math.random()*30)+15, amount: Math.floor(Math.random()*400000)+150000, cvr: (3+Math.random()*3).toFixed(1), cpa: Math.floor(2400+Math.random()*800) })),
    ads: [
      { platform: "Facebook", spend: 320000, result: 128, efficiency: 2500, rate: 4.8, status: "active", trend: "up" },
      { platform: "Google", spend: 280000, result: 89, efficiency: 3146, rate: 3.2, status: "active", trend: "down" },
      { platform: "X (Twitter)", spend: 150000, result: 67, efficiency: 2239, rate: 5.1, status: "active", trend: "up" },
      { platform: "Instagram", spend: 210000, result: 94, efficiency: 2234, rate: 4.5, status: "active", trend: "up" },
      { platform: "リターゲティング", spend: 95000, result: 45, efficiency: 2111, rate: 7.2, status: "active", trend: "up" },
    ],
    funnel: [
      { name: "広告表示", value: 890000, rate: null }, { name: "クリック", value: 24500, rate: "2.8%" },
      { name: "CFページ", value: 18200, rate: "74.3%" }, { name: "リターン選択", value: 2100, rate: "11.5%" },
      { name: "支援完了", value: 423, rate: "20.1%" },
    ],
    channels: [ { name: "広告", value: 48, color: V.accent }, { name: "LINE", value: 31, color: V.line }, { name: "自然流入", value: 14, color: "#8B5CF6" }, { name: "Email", value: 7, color: "#F97316" } ],
  },
};

// ── Real data hook (API first → mock fallback) ──
function useRealData(phase) {
  const [data, setData] = useState({ leads: null, ads: null, funnel: null, loading: true, isReal: false });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [leadsRes, adsRes, funnelRes] = await Promise.allSettled([
          fetch(`/api/leads?phase=${phase}&days=14`).then(r => r.json()),
          fetch(`/api/ads/metrics?phase=${phase}&days=14`).then(r => r.json()),
          fetch(`/api/analytics/funnel?phase=${phase}&days=30`).then(r => r.json()),
        ]);
        if (cancelled) return;
        const leads = leadsRes.status === 'fulfilled' && !leadsRes.value.error ? leadsRes.value : null;
        const ads = adsRes.status === 'fulfilled' && !adsRes.value.error ? adsRes.value : null;
        const funnel = funnelRes.status === 'fulfilled' && !funnelRes.value.error ? funnelRes.value : null;
        const hasReal = (leads?.totals?.total > 0) || (ads?.totals?.impressions > 0);
        setData({ leads, ads, funnel, loading: false, isReal: hasReal });
      } catch {
        if (!cancelled) setData(prev => ({ ...prev, loading: false, isReal: false }));
      }
    }
    load();
    return () => { cancelled = true; };
  }, [phase]);

  return data;
}

// ── Shared Components ──
function PhaseToggle({ phase, setPhase }) {
  return (
    <div style={{ display: "inline-flex", background: V.surfaceAlt, borderRadius: 12, padding: 3, gap: 3 }}>
      {Object.values(PHASES).map(p => {
        const a = phase === p.id;
        return <button key={p.id} onClick={() => setPhase(p.id)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: a ? V.surface : "transparent", color: a ? p.color : V.textMuted, fontSize: 13, fontWeight: a ? 700 : 500, fontFamily: "inherit", boxShadow: a ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: a ? p.color : "transparent", border: a ? "none" : `1.5px solid ${V.textMuted}` }} />{p.label}
        </button>;
      })}
    </div>
  );
}

function PhaseBar({ phase }) {
  const p = PHASES[phase];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: p.colorLight, borderRadius: V.radiusSm, marginBottom: 24, border: `1px solid ${p.color}20` }}>
      <span style={{ fontSize: 18 }}>{p.icon}</span>
      <div><div style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.label}モード</div><div style={{ fontSize: 11, color: V.textSub }}>{p.description}</div></div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
        {p.kpis.map(k => <span key={k} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: V.surface, color: p.color, border: `1px solid ${p.color}30` }}>{k}</span>)}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, trend, trendVal, color }) {
  const isCost = label.includes("CP");
  return (
    <div style={{ background: V.surface, borderRadius: V.radius, padding: "20px 22px", border: `1px solid ${V.border}`, position: "relative", overflow: "hidden" }}>
      {color && <div style={{ position: "absolute", top: -12, right: -12, width: 56, height: 56, borderRadius: "50%", background: `${color}10` }} />}
      <div style={{ fontSize: 12, color: V.textSub, fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: V.text, lineHeight: 1, fontFamily: "'Outfit',sans-serif", letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        {trend && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: trend === "up" ? (isCost ? V.errorLight : V.greenLight) : (isCost ? V.greenLight : V.errorLight), color: trend === "up" ? (isCost ? V.error : V.green) : (isCost ? V.green : V.error) }}><span style={{ fontSize: 10 }}>{trend === "up" ? "▲" : "▼"}</span>{trendVal}</span>}
        {sub && <span style={{ fontSize: 11, color: V.textMuted }}>{sub}</span>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = { active: { l: "配信中", bg: V.greenLight, c: V.green }, paused: { l: "停止", bg: V.warningLight, c: V.warningText }, draft: { l: "下書き", bg: V.surfaceAlt, c: V.textSub }, scheduled: { l: "予約済", bg: `${fg.link}10`, c: V.link }, published: { l: "公開中", bg: V.greenLight, c: V.green }, deployed: { l: "デプロイ済", bg: V.greenLight, c: V.green } };
  const s = m[status] || m.draft;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: s.bg, color: s.c }}>{s.l}</span>;
}

// ── Sidebar ──
function Sidebar({ active, onNav, phase }) {
  const items = [
    { id: "dashboard", label: "ダッシュボード", icon: "⊞" },
    { id: "ads", label: "広告管理", icon: "◈" },
    { id: "kpi_sim", label: "KPIシミュレーション", icon: "📊" },
    { id: "lp", label: "LP 作成・デプロイ", icon: "▤" },
    { id: "creative", label: "画像生成", icon: "🎨" },
    { id: "returns", label: "リターン設計", icon: "🎁" },
    { id: "nurture", label: "ナーチャリング", icon: "⇢" },
    { id: "roadmap", label: "集客ロードマップ", icon: "🗺️" },
    { id: "analytics", label: "レポート", icon: "◔" },
    { id: "settings", label: "設定・連携", icon: "⚙" },
  ];
  const pc = PHASES[phase].color;
  return (
    <nav style={{ width: 232, minHeight: "100vh", background: V.footer, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 1, position: "fixed", left: 0, top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${pc}, ${pc}AA)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff", fontFamily: "'Outfit',sans-serif", transition: "background 0.4s" }}>CF</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'Outfit',sans-serif", lineHeight: 1.1 }}>CrowdFuel</div>
          <div style={{ color: pc, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", fontFamily: "'IBM Plex Mono',monospace" }}>{PHASES[phase].sub.toUpperCase()}</div>
        </div>
      </div>
      <div style={{ margin: "4px 12px 16px", padding: "6px 10px", borderRadius: 8, background: `${pc}15`, border: `1px solid ${pc}25`, fontSize: 11, color: pc, fontWeight: 600, textAlign: "center" }}>{PHASES[phase].icon} {PHASES[phase].label}モード</div>
      {items.map(item => {
        const isA = active === item.id;
        return <button key={item.id} onClick={() => onNav(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: V.radiusSm, background: isA ? `${pc}18` : "transparent", color: isA ? pc : V.textMuted, border: "none", cursor: "pointer", fontSize: 14, fontWeight: isA ? 600 : 400, fontFamily: "inherit", transition: "all 0.15s", textAlign: "left", width: "100%" }}><span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>{item.label}</button>;
      })}
    </nav>
  );
}

// ── Dashboard ──
function DashboardPage({ phase }) {
  const d = MOCK[phase]; const pc = PHASES[phase].color;
  const realData = useRealData(phase);
  return (
    <div>
      <PhaseBar phase={phase} />
      {!realData.loading && (
        <div style={{ marginBottom: 14, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
          background: realData.isReal ? V.greenLight : V.warningLight, color: realData.isReal ? V.green : V.warningText }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
          {realData.isReal ? 'ライブデータ' : 'モックデータ（設定→接続で実データに切替）'}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {d.stats.map((s,i) => <StatCard key={i} {...s} color={i===0?pc:null} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "5fr 2fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18 }}>{phase==="lead"?"リード獲得推移":"支援者推移"}</div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={d.daily}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={phase==="lead"?V.line:V.accent} stopOpacity={0.18}/><stop offset="100%" stopColor={phase==="lead"?V.line:V.accent} stopOpacity={0}/></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={phase==="lead"?V.accent:"#8B5CF6"} stopOpacity={0.12}/><stop offset="100%" stopColor={phase==="lead"?V.accent:"#8B5CF6"} stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: V.textMuted }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: V.textMuted }} width={30} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${V.border}`, fontSize: 12 }} />
              {phase==="lead" ? <>
                <Area type="monotone" dataKey="line" stroke={V.line} fill="url(#g1)" strokeWidth={2.5} name="LINE" />
                <Area type="monotone" dataKey="email" stroke={V.accent} fill="url(#g2)" strokeWidth={2} name="Email" />
              </> : <>
                <Area type="monotone" dataKey="backers" stroke={V.accent} fill="url(#g1)" strokeWidth={2.5} name="支援者" />
                <Area type="monotone" dataKey="cvr" stroke="#8B5CF6" fill="url(#g2)" strokeWidth={2} name="CVR%" />
              </>}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{phase==="lead"?"登録チャネル":"支援流入元"}</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart><Pie data={d.channels} cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={3} dataKey="value">
              {d.channels.map((e,i)=><Cell key={i} fill={e.color}/>)}
            </Pie></PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 8 }}>
            {d.channels.map(c => <div key={c.name} style={{ textAlign: "center", fontSize: 11 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, margin: "0 auto 3px" }} /><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ color: V.textMuted }}>{c.value}%</div></div>)}
          </div>
        </div>
      </div>
      <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>プラットフォーム別効率</div>
        {d.ads.map(ad => (
          <div key={ad.platform} style={{ display: "grid", gridTemplateColumns: "130px 1fr 80px 80px 80px 70px", alignItems: "center", padding: "12px 16px", borderRadius: V.radiusSm, background: V.surfaceAlt, marginBottom: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: PLATFORM_COLORS[ad.platform]||V.textMuted }} />{ad.platform}</span>
            <div style={{ height: 6, background: V.border, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 3, width: `${(ad.result/Math.max(...d.ads.map(a=>a.result)))*100}%`, background: PLATFORM_COLORS[ad.platform]||V.accent }} /></div>
            <div style={{ textAlign: "right", fontSize: 13 }}><div style={{ fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>{ad.result}</div><div style={{ fontSize: 10, color: V.textMuted }}>{phase==="lead"?"リード":"支援者"}</div></div>
            <div style={{ textAlign: "right", fontSize: 13 }}><div style={{ fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>¥{ad.efficiency.toLocaleString()}</div><div style={{ fontSize: 10, color: V.textMuted }}>{phase==="lead"?"CPL":"CPA"}</div></div>
            <div style={{ textAlign: "right", fontSize: 13 }}><div style={{ fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>{ad.rate}%</div><div style={{ fontSize: 10, color: V.textMuted }}>CVR</div></div>
            <div style={{ textAlign: "right" }}><StatusBadge status={ad.status}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ads ──
function AdsPage({ phase }) {
  const d = MOCK[phase]; const pc = PHASES[phase].color;
  const eff = phase==="lead"?"CPL":"CPA"; const res = phase==="lead"?"リード":"支援者";
  return (
    <div>
      <PhaseBar phase={phase} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="総広告費" value={phase==="lead"?"¥136K":"¥1.06M"} trend="up" trendVal={phase==="lead"?"+8%":"+12%"} sub="今月" />
        <StatCard label={`総${res}`} value={phase==="lead"?"827":"423"} trend="up" trendVal={phase==="lead"?"+15%":"+22%"} color={pc} />
        <StatCard label={`平均${eff}`} value={phase==="lead"?"¥164":"¥2,506"} trend="down" trendVal={phase==="lead"?"-¥12":"-¥284"} sub="改善中" />
        <StatCard label="平均CVR" value={phase==="lead"?"16.2%":"4.2%"} trend="up" trendVal={phase==="lead"?"+1.4pt":"+0.6pt"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{eff} 推移</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={d.daily}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: V.textMuted }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: V.textMuted }} width={45} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${V.border}`, fontSize: 12 }} />
              <Line type="monotone" dataKey={phase==="lead"?"cpl":"cpa"} stroke={pc} strokeWidth={2.5} dot={false} name={`${eff}(¥)`} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>CVR 推移</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={d.daily}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: V.textMuted }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: V.textMuted }} width={35} unit="%" />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${V.border}`, fontSize: 12 }} />
              <Line type="monotone" dataKey="cvr" stroke="#8B5CF6" strokeWidth={2.5} dot={false} name="CVR(%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ background: V.surface, borderRadius: V.radius, border: `1px solid ${V.border}`, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${V.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>キャンペーン一覧</div>
          <button style={{ padding: "8px 16px", borderRadius: V.radiusSm, background: pc, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>＋ 新規</button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ borderBottom: `1px solid ${V.border}` }}>
            {["プラットフォーム","ステータス","広告費",res,eff,"CVR","操作"].map(h=><th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 600, color: V.textMuted, background: (h===eff||h==="CVR")?`${pc}06`:"transparent" }}>{h}</th>)}
          </tr></thead>
          <tbody>{d.ads.map((ad,i)=>(
            <tr key={i} style={{ borderBottom: `1px solid ${V.border}` }}>
              <td style={{ padding: "14px 18px", fontWeight: 600 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: PLATFORM_COLORS[ad.platform]||V.textMuted }}/>{ad.platform}</span></td>
              <td style={{ padding: "14px 18px" }}><StatusBadge status={ad.status}/></td>
              <td style={{ padding: "14px 18px", fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>¥{ad.spend>=1000?`${(ad.spend/1000).toFixed(0)}K`:ad.spend}</td>
              <td style={{ padding: "14px 18px", fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>{ad.result}</td>
              <td style={{ padding: "14px 18px", fontFamily: "'Outfit',sans-serif", fontWeight: 700, background: `${pc}04`, color: ad.efficiency<=(phase==="lead"?170:2500)?V.green:V.text }}>¥{ad.efficiency.toLocaleString()}</td>
              <td style={{ padding: "14px 18px", fontFamily: "'Outfit',sans-serif", fontWeight: 700, background: `${pc}04`, color: ad.rate>=(phase==="lead"?16:4.5)?V.green:V.text }}>{ad.rate}%</td>
              <td style={{ padding: "14px 18px" }}><button style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${V.border}`, background: V.surface, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{ad.status==="active"?"⏸ 停止":"▶ 再開"}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── LP Builder + Deploy ──
function LPPage({ phase }) {
  const [form, setForm] = useState({ name: "", tagline: "", desc: "", platform: "campfire", style: "minimal" });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [deployedLPs, setDeployedLPs] = useState([]);
  const iframeRef = useRef(null);
  const pc = PHASES[phase].color;
  const PLATS = [{ id: "campfire", l: "CAMPFIRE", c: V.accent }, { id: "makuake", l: "Makuake", c: "#00A0E9" }, { id: "greenfunding", l: "GreenFunding", c: V.green }];

  // Load deployed LPs
  useEffect(() => {
    fetch('/api/list-lps').then(r=>r.json()).then(d=>{ if(d.lps) setDeployedLPs(d.lps); }).catch(()=>{});
  }, [deployResult]);

  const generate = async () => {
    setGenerating(true); setDeployResult(null);
    const plat = PLATS.find(p=>p.id===form.platform);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000,
          messages: [{ role: "user", content: `${phase==="lead"?"クラファン先行登録用":"クラファン支援募集用"}ティザーLPのHTMLを生成。
プロダクト: ${form.name} / タグライン: ${form.tagline} / 概要: ${form.desc}
プラットフォーム: ${plat.l} / スタイル: ${form.style}
要件: 完全なHTML(<!DOCTYPE html>〜</html>)、CSSインライン、レスポンシブ、Google Fonts日本語、Intersection Observerアニメーション。
${phase==="lead" ? "CTA: LINE登録ボタン(緑)+メール入力フォーム。「先行登録で限定リターン情報をお届け」。CTAを最大限目立たせる。" : "CTA: 「今すぐ支援する」大ボタン+支援者数カウンター+達成率プログレスバー+残り日数。緊急感。"}
「${plat.l}で${phase==="lead"?"近日公開":"実施中"}」バッジ。ヒーロー、課題提起、ソリューション、特徴3つ、CTA、フッター。HTMLのみ出力。` }] }),
      });
      const data = await res.json();
      let html = data.content?.[0]?.text || "";
      const m = html.match(/```html?\s*([\s\S]*?)```/); if (m) html = m[1];
      if (!html.trim().startsWith("<!DOCTYPE")) { const idx = html.indexOf("<!DOCTYPE"); if (idx!==-1) html = html.substring(idx); }
      setGenerated(html);
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const deploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch('/api/deploy-lp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: generated, name: form.name || 'Untitled LP', phase }),
      });
      const data = await res.json();
      setDeployResult(data);
    } catch (e) { setDeployResult({ error: e.message }); }
    setDeploying(false);
  };

  useEffect(() => {
    if (generated && iframeRef.current) { const doc = iframeRef.current.contentDocument; doc.open(); doc.write(generated); doc.close(); }
  }, [generated]);

  // Preview mode
  if (generated) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20, fontFamily: "'Outfit',sans-serif" }}>LP プレビュー</div>
          <div style={{ fontSize: 12, color: V.textSub }}>{form.name} — {PHASES[phase].label}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setGenerated(""); setDeployResult(null); }} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${V.border}`, background: V.surface, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>← 戻る</button>
          <button onClick={() => navigator.clipboard.writeText(generated)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${V.border}`, background: V.surface, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>📋 HTML</button>
          <button onClick={() => { const b = new Blob([generated],{type:"text/html"}); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${form.name||"lp"}.html`; a.click(); }}
            style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${V.border}`, background: V.surface, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⬇ DL</button>
          <button onClick={deploy} disabled={deploying}
            style={{ padding: "8px 20px", borderRadius: 8, background: deploying ? V.border : V.green, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: deploying ? "default" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {deploying ? "⏳ デプロイ中..." : "🚀 デプロイ"}
          </button>
        </div>
      </div>

      {/* Deploy result */}
      {deployResult && (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: V.radiusSm, background: deployResult.success ? V.greenLight : deployResult.error === "KV_NOT_CONFIGURED" ? V.warningLight : V.errorLight, border: `1px solid ${deployResult.success ? V.green : deployResult.error === "KV_NOT_CONFIGURED" ? V.warningText : V.error}30` }}>
          {deployResult.success ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: V.green, marginBottom: 6 }}>✅ デプロイ完了!</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <code style={{ flex: 1, padding: "8px 12px", background: V.surface, borderRadius: 6, fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", border: `1px solid ${V.border}` }}>
                  {deployResult.url || deployResult.path}
                </code>
                <button onClick={() => navigator.clipboard.writeText(deployResult.url || window.location.origin + deployResult.path)}
                  style={{ padding: "8px 14px", borderRadius: 6, background: V.green, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>URL コピー</button>
                {deployResult.url && <a href={deployResult.url} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", borderRadius: 6, background: V.text, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>開く ↗</a>}
              </div>
            </div>
          ) : deployResult.error === "KV_NOT_CONFIGURED" ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: V.warningText, marginBottom: 4 }}>⚠️ Vercel KV 未設定</div>
              <div style={{ fontSize: 13, color: V.warningDark, lineHeight: 1.5 }}>
                LPのホスティングにはVercel KVストアが必要です。<br/>
                Vercel ダッシュボード → Storage → Create → KV → プロジェクトにリンク で設定してください。
              </div>
            </div>
          ) : (
            <div style={{ fontWeight: 600, fontSize: 13, color: V.error }}>❌ {deployResult.error || deployResult.message}</div>
          )}
        </div>
      )}

      <div style={{ borderRadius: V.radius, overflow: "hidden", border: `1px solid ${V.border}`, height: 560 }}>
        <iframe ref={iframeRef} style={{ width: "100%", height: "100%", border: "none" }} title="preview" />
      </div>
    </div>
  );

  // Builder mode
  return (
    <div>
      <PhaseBar phase={phase} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Left: Form */}
        <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>プロダクト情報</div>
          {[{ k:"name", l:"プロダクト名", p:"例: PoliLog" }, { k:"tagline", l:"タグライン", p:"例: Make Invisible Visible" }].map(f=>(
            <div key={f.k} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: V.textSub, marginBottom: 5 }}>{f.l}</label>
              <input value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p}
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${V.border}`, fontSize: 13, fontFamily: "inherit", background: V.bg, outline: "none" }} />
            </div>
          ))}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: V.textSub, marginBottom: 5 }}>概要</label>
            <textarea value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} rows={3} placeholder="プロダクトの概要..."
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${V.border}`, fontSize: 13, fontFamily: "inherit", background: V.bg, outline: "none", resize: "vertical" }} />
          </div>
        </div>
        {/* Right: Settings */}
        <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>設定</div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: V.textSub, marginBottom: 6 }}>プラットフォーム</label>
            <div style={{ display: "flex", gap: 8 }}>
              {PLATS.map(p=><button key={p.id} onClick={()=>setForm(pr=>({...pr,platform:p.id}))} style={{ flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", border: form.platform===p.id?`2px solid ${p.c}`:`1.5px solid ${V.border}`, background: form.platform===p.id?`${p.c}0A`:V.surface, fontSize: 12, fontWeight: 600, fontFamily: "inherit", color: form.platform===p.id?p.c:V.textSub }}>{p.l}</button>)}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: V.textSub, marginBottom: 6 }}>スタイル</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[{ id:"minimal", l:"ミニマル", i:"◯" }, { id:"bold", l:"ボールド", i:"■" }, { id:"tech", l:"テック", i:"⬡" }, { id:"warm", l:"ウォーム", i:"◠" }].map(s=>
                <button key={s.id} onClick={()=>setForm(p=>({...p,style:s.id}))} style={{ padding: "12px 8px", borderRadius: 8, cursor: "pointer", border: form.style===s.id?`2px solid ${V.text}`:`1.5px solid ${V.border}`, background: form.style===s.id?V.surfaceAlt:V.surface, fontSize: 12, fontWeight: 600, fontFamily: "inherit", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{s.i}</div>{s.l}
                </button>
              )}
            </div>
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: PHASES[phase].colorLight, border: `1px solid ${pc}20`, fontSize: 12, color: pc, fontWeight: 500 }}>
            {phase==="lead" ? "📝 LINE+メール登録のデュアルCTAを生成" : "🔥 「今すぐ支援」CTA+達成率バー+残日数を生成"}
          </div>
          <button onClick={generate} disabled={generating||!form.name||!form.tagline} style={{
            width: "100%", padding: "12px", borderRadius: V.radiusSm,
            background: (!form.name||!form.tagline)?V.border:pc, color: "#fff", border: "none",
            fontSize: 14, fontWeight: 700, cursor: (!form.name||!form.tagline)?"default":"pointer", fontFamily: "inherit",
          }}>{generating ? "⏳ Claude API で生成中..." : "✨ LP を生成"}</button>
          <div style={{ marginTop: 10, fontSize: 11, color: V.textMuted, textAlign: "center" }}>生成後にプレビュー確認 → ワンクリックでデプロイ</div>
        </div>
      </div>

      {/* Deployed LPs list */}
      <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>デプロイ済み LP</div>
        {deployedLPs.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: V.textMuted, fontSize: 13 }}>
            まだデプロイされたLPはありません。上のフォームからLPを生成→デプロイしてください。
          </div>
        ) : (
          deployedLPs.map((lp,i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i<deployedLPs.length-1?`1px solid ${V.border}`:"none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <StatusBadge status="deployed" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{lp.name}</span>
                <span style={{ fontSize: 11, color: V.textMuted }}>{PHASES[lp.phase]?.label || "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{ fontSize: 12, color: V.textSub, fontFamily: "'IBM Plex Mono',monospace" }}>/lp/{lp.id}</code>
                <a href={`/lp/${lp.id}`} target="_blank" rel="noopener noreferrer" style={{ padding: "5px 12px", borderRadius: 6, background: V.surfaceAlt, fontSize: 11, fontWeight: 600, color: V.textSub, textDecoration: "none" }}>開く ↗</a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Nurturing ──
function NurturePage({ phase }) {
  const pc = PHASES[phase].color;
  const seqs = phase==="lead" ? [
    { id:1, name:"先行登録お礼", ch:"LINE", delay:"即座", status:"active", open:78, sent:1240 },
    { id:2, name:"プロジェクトストーリー", ch:"Email", delay:"1日後", status:"active", open:45, sent:1180 },
    { id:3, name:"リターン先行案内", ch:"LINE", delay:"3日後", status:"active", open:62, sent:980 },
    { id:4, name:"開始リマインド", ch:"Email", delay:"7日後", status:"scheduled", open:null, sent:0 },
    { id:5, name:"開始直前プッシュ", ch:"LINE", delay:"前日", status:"draft", open:null, sent:0 },
  ] : [
    { id:1, name:"クラファン開始通知", ch:"LINE", delay:"開始時", status:"active", open:92, sent:1847 },
    { id:2, name:"早割終了リマインド", ch:"LINE", delay:"3日後", status:"active", open:71, sent:1600 },
    { id:3, name:"進捗報告+社会的証明", ch:"Email", delay:"7日後", status:"active", open:38, sent:1400 },
    { id:4, name:"ストレッチゴール告知", ch:"LINE", delay:"50%達成時", status:"scheduled", open:null, sent:0 },
    { id:5, name:"ラストチャンス", ch:"Email", delay:"最終日", status:"draft", open:null, sent:0 },
  ];
  const [showAI, setShowAI] = useState(false);
  const [aiForm, setAiForm] = useState({ ch: "LINE", subject: "", goal: "" });
  const [aiResult, setAiResult] = useState(""); const [composing, setComposing] = useState(false);
  const genMsg = async () => {
    setComposing(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500,
          messages: [{ role: "user", content: `クラファン${phase==="lead"?"先行登録者":"支援検討者"}向けの${aiForm.ch}メッセージ。件名:${aiForm.subject} 目的:${aiForm.goal} ${aiForm.ch==="LINE"?"200文字以内、絵文字適度":"メール形式"}。日本語。` }] }),
      });
      const data = await res.json(); setAiResult(data.content?.[0]?.text || "生成失敗");
    } catch { setAiResult("エラー"); } setComposing(false);
  };

  return (
    <div>
      <PhaseBar phase={phase} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: V.textSub }}>{phase==="lead"?"先行登録者を初日支援者に育成":"リード→支援完了+アップセルを促進"}</div>
        <button onClick={()=>setShowAI(!showAI)} style={{ padding: "8px 18px", borderRadius: V.radiusSm, background: pc, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✨ AI で作成</button>
      </div>
      {showAI && (
        <div style={{ background: V.surface, borderRadius: V.radius, padding: 22, border: `1px solid ${V.border}`, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: V.textSub, marginBottom: 5 }}>チャネル</label>
              <select value={aiForm.ch} onChange={e=>setAiForm(p=>({...p,ch:e.target.value}))} style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1.5px solid ${V.border}`, fontSize: 13, fontFamily: "inherit", background: V.bg }}><option value="LINE">LINE</option><option value="Email">Email</option></select></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: V.textSub, marginBottom: 5 }}>件名</label>
              <input value={aiForm.subject} onChange={e=>setAiForm(p=>({...p,subject:e.target.value}))} placeholder="例: リターン先行案内" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${V.border}`, fontSize: 13, fontFamily: "inherit", background: V.bg, outline: "none" }}/></div>
            <div><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: V.textSub, marginBottom: 5 }}>目的</label>
              <input value={aiForm.goal} onChange={e=>setAiForm(p=>({...p,goal:e.target.value}))} placeholder="例: 期待感を高める" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `1px solid ${V.border}`, fontSize: 13, fontFamily: "inherit", background: V.bg, outline: "none" }}/></div>
            <button onClick={genMsg} disabled={composing} style={{ padding: "9px 18px", borderRadius: 8, background: V.text, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{composing?"⏳":"生成"}</button>
          </div>
          {aiResult && <div style={{ marginTop: 14, padding: 14, background: V.surfaceAlt, borderRadius: 8, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aiResult}</div>}
        </div>
      )}
      <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>{phase==="lead"?"先行登録ナーチャリング":"支援促進シーケンス"}</div>
        {seqs.map((seq,i)=>(
          <div key={seq.id} style={{ display: "flex", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 36, flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: seq.status==="active"?pc:seq.status==="scheduled"?V.link:V.border, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 }}>{seq.status==="active"?"✓":i+1}</div>
              {i<seqs.length-1 && <div style={{ width: 2, flex: 1, background: V.border, minHeight: 20 }} />}
            </div>
            <div style={{ flex: 1, padding: "10px 16px", borderRadius: V.radiusSm, background: V.surfaceAlt, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{seq.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: seq.ch==="LINE"?`${V.line}12`:V.accentLight, color: seq.ch==="LINE"?V.line:V.accent }}>{seq.ch}</span>
                  <StatusBadge status={seq.status}/>
                </div>
                <div style={{ fontSize: 12, color: V.textMuted }}>トリガー: {seq.delay}</div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                {seq.open!==null && <div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>{seq.open}%</div><div style={{ fontSize: 10, color: V.textMuted }}>開封率</div></div>}
                <div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, fontFamily: "'Outfit',sans-serif" }}>{seq.sent.toLocaleString()}</div><div style={{ fontSize: 10, color: V.textMuted }}>配信数</div></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analytics ──
function AnalyticsPage({ phase }) {
  const d = MOCK[phase]; const pc = PHASES[phase].color;
  return (
    <div>
      <PhaseBar phase={phase} />
      <div style={{ background: V.surface, borderRadius: V.radius, padding: 28, border: `1px solid ${V.border}`, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div><div style={{ fontWeight: 700, fontSize: 16 }}>コンバージョンファネル</div><div style={{ fontSize: 12, color: V.textMuted, marginTop: 2 }}>{phase==="lead"?"広告表示→LP→先行登録":"広告表示→CFページ→支援完了"}</div></div>
        </div>
        {d.funnel.map((f,i) => {
          const pct = (f.value/d.funnel[0].value)*100;
          return <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div style={{ width: 100, fontSize: 13, fontWeight: 500, color: V.textSub, textAlign: "right", flexShrink: 0 }}>{f.name}</div>
            <div style={{ flex: 1 }}><div style={{ height: 32, background: V.surfaceAlt, borderRadius: 8, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.max(pct,2)}%`, borderRadius: 8, background: `linear-gradient(90deg,${pc},${pc}BB)`, display: "flex", alignItems: "center", paddingLeft: pct>8?12:0, minWidth: 40 }}><span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "'Outfit',sans-serif" }}>{f.value.toLocaleString()}</span></div></div></div>
            <div style={{ width: 55, fontSize: 13, fontWeight: 600, color: f.rate?pc:V.textMuted, textAlign: "right", flexShrink: 0 }}>{f.rate||"—"}</div>
          </div>;
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>プラットフォーム別 {phase==="lead"?"CPL":"CPA"}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.ads} layout="vertical">
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: V.textMuted }} />
              <YAxis type="category" dataKey="platform" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: V.textSub }} width={90} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${V.border}`, fontSize: 12 }} />
              <Bar dataKey="efficiency" radius={[0,6,6,0]} name={`${phase==="lead"?"CPL":"CPA"}(¥)`}>{d.ads.map((e,i)=><Cell key={i} fill={PLATFORM_COLORS[e.platform]||V.accent}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: V.surface, borderRadius: V.radius, padding: 24, border: `1px solid ${V.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>プラットフォーム別 CVR</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.ads} layout="vertical">
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: V.textMuted }} unit="%" />
              <YAxis type="category" dataKey="platform" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: V.textSub }} width={90} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${V.border}`, fontSize: 12 }} />
              <Bar dataKey="rate" radius={[0,6,6,0]} name="CVR(%)">{d.ads.map((e,i)=><Cell key={i} fill={PLATFORM_COLORS[e.platform]||"#8B5CF6"}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ marginTop: 20, padding: "14px 20px", borderRadius: V.radiusSm, background: `${pc}08`, border: `1px solid ${pc}20`, fontSize: 13, color: V.textSub }}>
        💡 {phase==="lead" ? "リード創出フェーズではCPLとCVRが最重要KPI。LPのCTA率改善がCPL低減に直結します。" : "支援創出フェーズではCPAとCVRが最重要KPI。リターゲティング広告の支援率は新規の2〜3倍の傾向があります。"}
      </div>
    </div>
  );
}

// ── Settings (Real API connections) ──
function SettingsPage() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editProvider, setEditProvider] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [dbReady, setDbReady] = useState(null);

  const PROVIDERS = [
    { id: 'line', name: 'LINE 公式アカウント', icon: '💬', fields: [
      { key: 'channel_access_token', label: 'Channel Access Token', placeholder: 'LINE Developers Console から取得' },
      { key: 'channel_secret', label: 'Channel Secret', placeholder: 'チャネル基本設定から取得' },
      { key: 'project_name', label: 'プロジェクト名（ウェルカムメッセージ用）', placeholder: '例: PoliLog' },
    ]},
    { id: 'sendgrid', name: 'SendGrid (Email)', icon: '📧', fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'SG.xxxx' },
      { key: 'from_email', label: '送信元メール', placeholder: 'hello@yourdomain.com（要ドメイン認証）' },
    ]},
    { id: 'meta', name: 'Meta (FB/IG) Ads', icon: '📘', fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'EAAxxxx（Marketing API Tools で生成）' },
      { key: 'ad_account_id', label: '広告アカウントID', placeholder: 'act_123456789' },
      { key: 'app_id', label: 'App ID', placeholder: 'Meta Developer App ID' },
      { key: 'app_secret', label: 'App Secret', placeholder: 'Meta Developer App Secret' },
    ]},
    { id: 'google_ads', name: 'Google Ads', icon: '🔍', fields: [
      { key: 'developer_token', label: 'Developer Token', placeholder: 'API Center から取得（22文字）' },
      { key: 'client_id', label: 'OAuth Client ID', placeholder: 'xxx.apps.googleusercontent.com' },
      { key: 'client_secret', label: 'OAuth Client Secret', placeholder: '' },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: 'OAuth2 フローで取得' },
      { key: 'customer_id', label: 'Customer ID', placeholder: '123-456-7890' },
    ]},
    { id: 'x_ads', name: 'X (Twitter) Ads', icon: '🐦', fields: [
      { key: 'api_key', label: 'API Key', placeholder: '' },
      { key: 'api_secret', label: 'API Secret', placeholder: '' },
      { key: 'access_token', label: 'Access Token', placeholder: '' },
      { key: 'access_token_secret', label: 'Access Token Secret', placeholder: '' },
      { key: 'account_id', label: 'Ad Account ID', placeholder: '' },
    ]},
  ];

  useEffect(() => {
    fetch('/api/settings/connections').then(r => r.json())
      .then(d => { setConnections(d.connections || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getStatus = (providerId) => connections.find(c => c.provider === providerId)?.status || 'disconnected';

  const initMigration = async () => {
    setDbReady('migrating');
    try {
      const res = await fetch('/api/setup', { method: 'POST', headers: { 'x-setup-key': 'crowdfuel-setup-2026' } });
      const data = await res.json();
      setDbReady(data.success ? 'ready' : 'error');
    } catch { setDbReady('error'); }
  };

  const saveCredentials = async (providerId) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/connections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId, credentials: formData }),
      });
      const data = await res.json();
      if (data.success) {
        setConnections(prev => prev.map(c => c.provider === providerId ? { ...c, status: 'connected' } : c).concat(
          prev.find(c => c.provider === providerId) ? [] : [{ provider: providerId, status: 'connected' }]
        ));
        setEditProvider(null); setFormData({});
      } else { alert(data.error); }
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const disconnect = async (providerId) => {
    if (!confirm('この接続を解除しますか？')) return;
    await fetch('/api/settings/connections', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: providerId }),
    });
    setConnections(prev => prev.map(c => c.provider === providerId ? { ...c, status: 'disconnected' } : c));
  };

  return (
    <div>
      {/* DB Setup */}
      <div style={{ background: V.surface, borderRadius: V.radius, padding: 20, border: `1px solid ${V.border}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🗄</span>データベース初期化
            </div>
            <div style={{ fontSize: 12, color: V.textMuted, marginTop: 4 }}>
              初回のみ実行。Vercel Postgres にテーブルを作成します。
            </div>
          </div>
          <button onClick={initMigration} disabled={dbReady === 'migrating'}
            style={{ padding: '8px 16px', borderRadius: 8, background: dbReady === 'ready' ? V.green : V.text, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {dbReady === 'migrating' ? '⏳...' : dbReady === 'ready' ? '✓ 完了' : dbReady === 'error' ? '❌ 再試行' : '🚀 マイグレーション実行'}
          </button>
        </div>
      </div>

      {/* Provider Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {PROVIDERS.map(prov => {
          const st = getStatus(prov.id);
          const isEditing = editProvider === prov.id;

          return (
            <div key={prov.id} style={{ background: V.surface, borderRadius: V.radius, padding: 20, border: `1px solid ${isEditing ? V.accent : V.border}`, transition: 'border 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEditing ? 16 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{prov.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{prov.name}</div>
                    <div style={{ fontSize: 11, color: st === 'connected' ? V.green : V.textMuted }}>
                      {st === 'connected' ? '✓ 接続済み' : '未接続'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {st === 'connected' && (
                    <button onClick={() => disconnect(prov.id)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${V.border}`, background: V.surface, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: V.error }}>解除</button>
                  )}
                  <button onClick={() => { setEditProvider(isEditing ? null : prov.id); setFormData({}); }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: st === 'connected' ? V.greenLight : V.surfaceAlt, color: st === 'connected' ? V.green : V.textSub }}>
                    {isEditing ? '閉じる' : st === 'connected' ? '更新' : '接続'}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div style={{ marginTop: 4 }}>
                  {prov.fields.map(f => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: V.textSub, marginBottom: 4 }}>{f.label}</label>
                      <input
                        type={f.key.includes('secret') || f.key.includes('token') || f.key.includes('api_key') ? 'password' : 'text'}
                        value={formData[f.key] || ''}
                        onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 6, border: `1.5px solid ${V.border}`, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", background: V.bg, outline: 'none' }}
                      />
                    </div>
                  ))}
                  <button onClick={() => saveCredentials(prov.id)} disabled={saving}
                    style={{ width: '100%', padding: '9px', borderRadius: 8, background: saving ? V.border : V.accent, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', marginTop: 4 }}>
                    {saving ? '⏳ 保存中...' : '💾 保存して接続'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Webhook info */}
      <div style={{ marginTop: 20, background: V.surface, borderRadius: V.radius, padding: 20, border: `1px solid ${V.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📌 Webhook URL（LINE に設定）</div>
        <code style={{ display: 'block', padding: '10px 14px', background: V.surfaceAlt, borderRadius: 8, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", color: V.text, wordBreak: 'break-all' }}>
          {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/line` : '/api/webhook/line'}
        </code>
        <div style={{ fontSize: 11, color: V.textMuted, marginTop: 6 }}>
          LINE Developers Console → Messaging API → Webhook URL にこのURLを設定してください。
        </div>
      </div>
    </div>
  );
}

// ── Main App ──
export default function CrowdFuelApp() {
  const [page, setPage] = useState("dashboard");
  const [phase, setPhase] = useState("lead");
  const titles = { dashboard: "ダッシュボード", ads: "広告管理", kpi_sim: "KPIシミュレーション", lp: "LP 作成・デプロイ", creative: "画像生成", returns: "リターン設計", nurture: "ナーチャリング", roadmap: "集客ロードマップ", analytics: "レポート", settings: "設定・連携" };
  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardPage phase={phase}/>;
      case "ads": return <AdsPage phase={phase}/>;
      case "kpi_sim": return <KPISimulator V={V} phase={phase} />;
      case "lp": return <LPPage phase={phase}/>;
      case "creative": return <ImageGenerator V={V} />;
      case "returns": return <ReturnDesigner V={V} targetAmount={1000000} />;
      case "nurture": return <NurturePage phase={phase}/>;
      case "roadmap": return <CustomerRoadmap V={V} targetAmount={1000000} />;
      case "analytics": return <AnalyticsPage phase={phase}/>;
      case "settings": return <SettingsPage />;
      default: return <DashboardPage phase={phase}/>;
    }
  };
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: V.bg, fontFamily: "'DM Sans','Noto Sans JP',sans-serif", color: V.text }}>
      <Sidebar active={page} onNav={setPage} phase={phase} />
      <main style={{ flex: 1, marginLeft: 232, padding: "24px 36px", maxWidth: 1060 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Outfit',sans-serif", letterSpacing: "-0.02em" }}>{titles[page]}</h1>
          {!["settings","kpi_sim","creative","returns","roadmap"].includes(page) && <PhaseToggle phase={phase} setPhase={setPhase}/>}
        </div>
        {renderPage()}
      </main>
    </div>
  );
}
