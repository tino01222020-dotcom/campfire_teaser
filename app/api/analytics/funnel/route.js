import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/analytics/funnel — full conversion funnel
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get('phase') || 'lead';
  const days = parseInt(searchParams.get('days') || '30');

  try {
    // Ad totals (top of funnel)
    const { rows: adTotals } = await sql`
      SELECT
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(spend)::numeric as spend,
        SUM(conversions) as ad_conversions
      FROM ad_metrics
      WHERE date > CURRENT_DATE - ${days}`;

    // Lead totals (bottom of funnel)
    const { rows: leadTotals } = await sql`
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE channel = 'line') as line_leads,
        COUNT(*) FILTER (WHERE channel = 'email') as email_leads
      FROM leads
      WHERE phase = ${phase} AND created_at > NOW() - (${days} || ' days')::interval`;

    const impressions = parseInt(adTotals[0]?.impressions || 0);
    const clicks = parseInt(adTotals[0]?.clicks || 0);
    const spend = parseFloat(adTotals[0]?.spend || 0);
    const totalLeads = parseInt(leadTotals[0]?.total_leads || 0);

    const funnel = phase === 'lead' ? [
      { name: '広告表示', value: impressions, rate: null },
      { name: 'LP訪問 (クリック)', value: clicks, rate: impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) + '%' : '—' },
      { name: '登録完了', value: totalLeads, rate: clicks > 0 ? ((totalLeads / clicks) * 100).toFixed(1) + '%' : '—' },
    ] : [
      { name: '広告表示', value: impressions, rate: null },
      { name: 'クリック', value: clicks, rate: impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) + '%' : '—' },
      { name: '支援完了', value: totalLeads, rate: clicks > 0 ? ((totalLeads / clicks) * 100).toFixed(2) + '%' : '—' },
    ];

    // Channel breakdown
    const channels = [
      { name: 'LINE', value: parseInt(leadTotals[0]?.line_leads || 0), color: '#06C755' },
      { name: 'Email', value: parseInt(leadTotals[0]?.email_leads || 0), color: '#F97316' },
    ];

    // ROI summary
    const roi = {
      total_spend: spend,
      total_conversions: totalLeads,
      cost_per_conversion: totalLeads > 0 ? spend / totalLeads : 0,
      overall_cvr: clicks > 0 ? ((totalLeads / clicks) * 100).toFixed(2) : '0',
    };

    return NextResponse.json({ funnel, channels, roi, period_days: days });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
