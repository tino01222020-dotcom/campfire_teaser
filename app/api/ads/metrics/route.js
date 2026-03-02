import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/ads/metrics — aggregated ad performance data
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get('phase') || 'lead';
  const days = parseInt(searchParams.get('days') || '14');

  try {
    // Per-provider summary
    const { rows: byProvider } = await sql`
      SELECT
        provider,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(spend)::numeric as spend,
        SUM(conversions) as conversions,
        CASE WHEN SUM(clicks) > 0 THEN SUM(clicks)::float / NULLIF(SUM(impressions), 0) * 100 ELSE 0 END as ctr,
        CASE WHEN SUM(conversions) > 0 THEN SUM(conversions)::float / NULLIF(SUM(clicks), 0) * 100 ELSE 0 END as cvr,
        CASE WHEN SUM(conversions) > 0 THEN SUM(spend) / NULLIF(SUM(conversions), 0) ELSE 0 END as cost_per_conv
      FROM ad_metrics
      WHERE date > CURRENT_DATE - ${days}
      GROUP BY provider
      ORDER BY SUM(spend) DESC`;

    // Daily trend
    const { rows: daily } = await sql`
      SELECT
        date,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(spend)::numeric as spend,
        SUM(conversions) as conversions,
        CASE WHEN SUM(conversions) > 0 THEN SUM(spend) / NULLIF(SUM(conversions), 0) ELSE 0 END as cost_per_conv,
        CASE WHEN SUM(clicks) > 0 THEN SUM(conversions)::float / NULLIF(SUM(clicks), 0) * 100 ELSE 0 END as cvr
      FROM ad_metrics
      WHERE date > CURRENT_DATE - ${days}
      GROUP BY date ORDER BY date`;

    // Per-campaign breakdown
    const { rows: byCampaign } = await sql`
      SELECT
        provider, campaign_name,
        SUM(spend)::numeric as spend,
        SUM(conversions) as conversions,
        CASE WHEN SUM(conversions) > 0 THEN SUM(spend) / NULLIF(SUM(conversions), 0) ELSE 0 END as cost_per_conv,
        CASE WHEN SUM(clicks) > 0 THEN SUM(conversions)::float / NULLIF(SUM(clicks), 0) * 100 ELSE 0 END as cvr
      FROM ad_metrics
      WHERE date > CURRENT_DATE - ${days}
      GROUP BY provider, campaign_name
      ORDER BY SUM(spend) DESC
      LIMIT 20`;

    // Totals
    const totals = byProvider.reduce((acc, row) => ({
      spend: acc.spend + parseFloat(row.spend || 0),
      conversions: acc.conversions + parseInt(row.conversions || 0),
      clicks: acc.clicks + parseInt(row.clicks || 0),
      impressions: acc.impressions + parseInt(row.impressions || 0),
    }), { spend: 0, conversions: 0, clicks: 0, impressions: 0 });

    totals.avg_cpl = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    totals.avg_cvr = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;

    return NextResponse.json({ totals, by_provider: byProvider, daily, by_campaign: byCampaign });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
