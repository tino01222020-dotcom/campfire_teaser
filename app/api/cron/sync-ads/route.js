import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { syncMetaMetrics } from '@/lib/integrations/meta';
import { syncGoogleMetrics } from '@/lib/integrations/google-ads';

// GET /api/cron/sync-ads — called by Vercel Cron every hour
export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in dev
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results = { meta: null, google: null, x: null, errors: [] };

  // Meta
  try {
    const metaConn = await getConnection('meta');
    if (metaConn?.status === 'connected') {
      results.meta = await syncMetaMetrics(metaConn.credentials);
    }
  } catch (e) {
    results.errors.push({ provider: 'meta', error: e.message });
  }

  // Google
  try {
    const googleConn = await getConnection('google_ads');
    if (googleConn?.status === 'connected') {
      results.google = await syncGoogleMetrics(googleConn.credentials);
    }
  } catch (e) {
    results.errors.push({ provider: 'google', error: e.message });
  }

  // X (Twitter) - placeholder for when implemented
  // try {
  //   const xConn = await getConnection('x_ads');
  //   if (xConn?.status === 'connected') {
  //     results.x = await syncXMetrics(xConn.credentials);
  //   }
  // } catch (e) {
  //   results.errors.push({ provider: 'x', error: e.message });
  // }

  return NextResponse.json({
    synced_at: new Date().toISOString(),
    ...results,
  });
}
