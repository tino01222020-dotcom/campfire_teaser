import { NextResponse } from 'next/server';
import { getAllConnections, saveConnection, removeConnection, getConnection } from '@/lib/db';

// GET /api/settings/connections — list all connection statuses
export async function GET() {
  try {
    const connections = await getAllConnections();
    const providers = ['meta', 'google_ads', 'x_ads', 'line', 'sendgrid', 'campfire', 'makuake'];
    const result = providers.map(p => {
      const conn = connections.find(c => c.provider === p);
      return { provider: p, status: conn?.status || 'disconnected', updated_at: conn?.updated_at || null };
    });
    return NextResponse.json({ connections: result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/settings/connections — save credentials for a provider
export async function POST(request) {
  try {
    const { provider, credentials } = await request.json();
    if (!provider || !credentials) {
      return NextResponse.json({ error: 'provider and credentials required' }, { status: 400 });
    }

    const validProviders = ['meta', 'google_ads', 'x_ads', 'line', 'sendgrid', 'campfire', 'makuake'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: `Invalid provider. Use: ${validProviders.join(', ')}` }, { status: 400 });
    }

    // Validate required fields per provider
    const required = {
      meta: ['access_token', 'ad_account_id'],
      google_ads: ['developer_token', 'client_id', 'client_secret', 'refresh_token', 'customer_id'],
      x_ads: ['api_key', 'api_secret', 'access_token', 'access_token_secret', 'account_id'],
      line: ['channel_access_token', 'channel_secret'],
      sendgrid: ['api_key', 'from_email'],
      campfire: ['api_key'],
      makuake: ['api_key'],
    };

    const missing = (required[provider] || []).filter(f => !credentials[f]);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing fields: ${missing.join(', ')}` }, { status: 400 });
    }

    await saveConnection(provider, credentials, 'connected');
    return NextResponse.json({ success: true, provider, status: 'connected' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/settings/connections — disconnect a provider
export async function DELETE(request) {
  try {
    const { provider } = await request.json();
    if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });
    await removeConnection(provider);
    return NextResponse.json({ success: true, provider, status: 'disconnected' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
