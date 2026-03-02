import { NextResponse } from 'next/server';
import { runNurtureEngine } from '@/lib/nurture-engine';

// GET /api/cron/nurture — called by Vercel Cron every 15 minutes
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runNurtureEngine();
    return NextResponse.json({ executed_at: new Date().toISOString(), ...results });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
