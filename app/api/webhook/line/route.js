import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { verifySignature, processWebhookEvents } from '@/lib/integrations/line';

// POST /api/webhook/line — LINE Platform sends events here
export async function POST(request) {
  try {
    const conn = await getConnection('line');
    if (!conn || conn.status !== 'connected') {
      return NextResponse.json({ error: 'LINE not configured' }, { status: 503 });
    }

    const creds = conn.credentials;
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');

    // Verify webhook authenticity
    if (!verifySignature(body, signature, creds.channel_secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const parsed = JSON.parse(body);
    const events = parsed.events || [];

    if (events.length === 0) {
      // LINE sends an empty event array for webhook URL verification
      return NextResponse.json({ ok: true });
    }

    const results = await processWebhookEvents(events, creds);
    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    console.error('LINE webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET — LINE webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'LINE webhook' });
}
