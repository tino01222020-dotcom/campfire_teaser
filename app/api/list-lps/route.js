import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const list = await kv.lrange('lp-list', 0, 49);
      const lps = list.map(item => typeof item === 'string' ? JSON.parse(item) : item);
      return NextResponse.json({ lps });
    }
    return NextResponse.json({ lps: [], kvConfigured: false });
  } catch (error) {
    return NextResponse.json({ lps: [], error: error.message }, { status: 500 });
  }
}
