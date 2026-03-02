import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = params;

  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return new NextResponse(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Setup Required</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F6F5F2;color:#1A1917;}
        .card{background:#fff;border-radius:16px;padding:40px;max-width:480px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);}
        h1{font-size:20px;margin-bottom:12px;}p{color:#6D6A62;font-size:14px;line-height:1.6;}</style>
        </head><body><div class="card"><h1>⚙️ Vercel KV 未設定</h1>
        <p>LPのホスティングにはVercel KVストアの設定が必要です。<br>Vercelダッシュボード → Storage → KV から作成してください。</p></div></body></html>`,
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const { kv } = await import('@vercel/kv');
    const html = await kv.get(`lp:${id}`);

    if (!html) {
      return new NextResponse(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not Found</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F6F5F2;color:#1A1917;}
        .card{background:#fff;border-radius:16px;padding:40px;max-width:400px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);}
        h1{font-size:48px;margin-bottom:8px;}p{color:#6D6A62;font-size:14px;}</style>
        </head><body><div class="card"><h1>404</h1><p>このLPは存在しないか、削除されました。</p></div></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Track view count
    kv.hincrby(`lp-meta:${id}`, 'views', 1).catch(() => {});

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('LP serve error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
