import { NextResponse } from 'next/server';

// Generate random ID: 8 chars alphanumeric
function generateId() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export async function POST(request) {
  try {
    const { html, name, phase } = await request.json();

    if (!html) {
      return NextResponse.json({ error: 'HTML is required' }, { status: 400 });
    }

    const id = generateId();
    const createdAt = new Date().toISOString();

    // Try Vercel KV first
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      
      // Store LP HTML
      await kv.set(`lp:${id}`, html);
      
      // Store metadata
      await kv.hset(`lp-meta:${id}`, { name: name || 'Untitled LP', phase: phase || 'lead', createdAt });
      
      // Add to list of all LPs
      await kv.lpush('lp-list', JSON.stringify({ id, name: name || 'Untitled LP', phase: phase || 'lead', createdAt }));

      const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : '';

      return NextResponse.json({
        success: true,
        id,
        path: `/lp/${id}`,
        url: `${baseUrl}/lp/${id}`,
        createdAt,
      });
    }

    // Fallback: no KV configured
    return NextResponse.json({
      error: 'KV_NOT_CONFIGURED',
      message: 'Vercel KV is not configured. Please add a KV store in your Vercel dashboard.',
      // Still return the ID so the client can use local preview
      id,
      path: `/lp/${id}`,
    }, { status: 503 });

  } catch (error) {
    console.error('Deploy LP error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
