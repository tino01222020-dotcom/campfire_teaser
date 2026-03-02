import { getConnection, sql } from '../db.js';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

export async function getMetaCredentials() {
  const conn = await getConnection('meta');
  if (!conn || conn.status !== 'connected') return null;
  return conn.credentials;
}

// Exchange short-lived token for long-lived (60 days)
export async function exchangeToken(shortToken, appId, appSecret) {
  const res = await fetch(
    `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return { access_token: data.access_token, expires_in: data.expires_in };
}

// Fetch ad account campaigns with insights
export async function fetchCampaignInsights(creds, dateRange = 'last_14d') {
  const { access_token, ad_account_id } = creds;
  if (!access_token || !ad_account_id) throw new Error('Missing Meta credentials');

  const fields = 'campaign_name,campaign_id,impressions,clicks,spend,actions,action_values,ctr,cpc,date_start,date_stop';
  const url = `${GRAPH_API}/${ad_account_id}/insights?fields=${fields}&date_preset=${dateRange}&level=campaign&time_increment=1&access_token=${access_token}&limit=500`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    if (data.error.code === 190) throw new Error('META_TOKEN_EXPIRED');
    throw new Error(data.error.message);
  }

  return (data.data || []).map(row => {
    const leads = (row.actions || []).find(a => a.action_type === 'lead')?.value || 0;
    const purchases = (row.actions || []).find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;
    const purchaseValue = (row.action_values || []).find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;
    const spend = parseFloat(row.spend || 0);
    const conversions = leads || purchases;

    return {
      provider: 'meta',
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      date: row.date_start,
      impressions: parseInt(row.impressions || 0),
      clicks: parseInt(row.clicks || 0),
      spend,
      conversions: parseInt(conversions),
      conv_value: parseFloat(purchaseValue),
      ctr: parseFloat(row.ctr || 0),
      cvr: conversions > 0 && parseInt(row.clicks) > 0 ? conversions / parseInt(row.clicks) : 0,
      cpl: conversions > 0 ? spend / conversions : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      raw_data: row,
    };
  });
}

// Fetch ad-level data
export async function fetchAdInsights(creds, dateRange = 'last_14d') {
  const { access_token, ad_account_id } = creds;
  const fields = 'ad_name,ad_id,adset_name,campaign_name,impressions,clicks,spend,actions,ctr,status';
  const url = `${GRAPH_API}/${ad_account_id}/insights?fields=${fields}&date_preset=${dateRange}&level=ad&access_token=${access_token}&limit=500`;

  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

// Store metrics in DB
export async function syncMetaMetrics(creds, phase = 'lead') {
  const rows = await fetchCampaignInsights(creds);
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
