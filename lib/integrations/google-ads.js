import { getConnection, sql } from '../db.js';

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v18';

export async function getGoogleCredentials() {
  const conn = await getConnection('google_ads');
  if (!conn || conn.status !== 'connected') return null;
  return conn.credentials;
}

// Refresh OAuth2 access token
async function refreshAccessToken(creds) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      refresh_token: creds.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Google OAuth error: ${data.error_description || data.error}`);
  return data.access_token;
}

// Fetch campaign performance using GAQL
export async function fetchCampaignReport(creds, startDate, endDate) {
  const accessToken = await refreshAccessToken(creds);
  const customerId = creds.customer_id.replace(/-/g, '');

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      segments.date
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
    ORDER BY segments.date DESC
  `;

  const url = `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': creds.developer_token,
      'Content-Type': 'application/json',
      ...(creds.login_customer_id ? { 'login-customer-id': creds.login_customer_id.replace(/-/g, '') } : {}),
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads API error: ${err}`);
  }

  const data = await res.json();
  const results = [];

  for (const batch of (data || [])) {
    for (const row of (batch.results || [])) {
      const spend = (parseInt(row.metrics?.costMicros || 0)) / 1_000_000;
      const conversions = parseFloat(row.metrics?.conversions || 0);
      const clicks = parseInt(row.metrics?.clicks || 0);

      results.push({
        provider: 'google',
        campaign_id: row.campaign?.id,
        campaign_name: row.campaign?.name,
        date: row.segments?.date,
        impressions: parseInt(row.metrics?.impressions || 0),
        clicks,
        spend,
        conversions: Math.round(conversions),
        conv_value: parseFloat(row.metrics?.conversionsValue || 0),
        ctr: parseFloat(row.metrics?.ctr || 0),
        cvr: clicks > 0 ? conversions / clicks : 0,
        cpl: conversions > 0 ? spend / conversions : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
        raw_data: row,
      });
    }
  }

  return results;
}

// Store metrics in DB
export async function syncGoogleMetrics(creds, phase = 'lead') {
  const end = new Date().toISOString().split('T')[0];
  const start = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
  const rows = await fetchCampaignReport(creds, start, end);
  let synced = 0;

  for (const row of rows) {
    await sql`
      INSERT INTO ad_metrics (provider, campaign_id, campaign_name, date, phase, impressions, clicks, spend, conversions, conv_value, ctr, cvr, cpl, cpa, raw_data, synced_at)
      VALUES (${row.provider}, ${row.campaign_id}, ${row.campaign_name}, ${row.date}, ${phase},
              ${row.impressions}, ${row.clicks}, ${row.spend}, ${row.conversions}, ${row.conv_value},
              ${row.ctr}, ${row.cvr}, ${row.cpl}, ${row.cpa}, ${JSON.stringify(row.raw_data)}, NOW())
      ON CONFLICT (provider, campaign_id, date) DO UPDATE SET
        campaign_name = EXCLUDED.campaign_name, impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks, spend = EXCLUDED.spend, conversions = EXCLUDED.conversions,
        conv_value = EXCLUDED.conv_value, ctr = EXCLUDED.ctr, cvr = EXCLUDED.cvr,
        cpl = EXCLUDED.cpl, cpa = EXCLUDED.cpa, raw_data = EXCLUDED.raw_data, synced_at = NOW()`;
    synced++;
  }

  return { synced, total: rows.length };
}
