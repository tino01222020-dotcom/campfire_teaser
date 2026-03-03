import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// ── Authentication ──
function authenticate(request) {
  const token = request.headers.get('x-worker-token');
  if (!token || token !== process.env.WORKER_SECRET) {
    return false;
  }
  return true;
}

// ── GET /api/ai-tasks — Poll for pending tasks (called by local worker) ──
export async function GET(request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20);

  try {
    const { rows } = await sql`
      SELECT * FROM ai_tasks
      WHERE status = ${status}
      ORDER BY created_at ASC
      LIMIT ${limit}`;

    return NextResponse.json({ tasks: rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── POST /api/ai-tasks — Create a new AI task (called by dashboard) ──
export async function POST(request) {
  try {
    const { task_type, input } = await request.json();

    if (!task_type) {
      return NextResponse.json({ error: 'task_type is required' }, { status: 400 });
    }

    const validTypes = [
      'generate_lp',       // LP自動生成
      'generate_nurture',  // ナーチャリング文面生成
      'analyze_data',      // データ分析・レポート
      'generate_ad_copy',  // 広告コピー生成
      'suggest_sequence',  // シーケンス提案
      'generate_image',    // クリエイティブ画像生成 (Gemini)
      'generate_returns',  // リターンアイデア生成 (Gemini)
      'expand_returns',    // リターンパッケージ生成 (Gemini)
    ];

    if (!validTypes.includes(task_type)) {
      return NextResponse.json({
        error: `Invalid task_type. Valid: ${validTypes.join(', ')}`,
      }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO ai_tasks (task_type, input, status)
      VALUES (${task_type}, ${JSON.stringify(input || {})}, 'pending')
      RETURNING *`;

    return NextResponse.json({ success: true, task: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── PATCH /api/ai-tasks — Update task status/result (called by worker) ──
export async function PATCH(request) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, status, result, error: taskError } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (status === 'processing') {
      await sql`
        UPDATE ai_tasks
        SET status = 'processing', started_at = NOW()
        WHERE id = ${id} AND status = 'pending'`;
    } else if (status === 'completed') {
      await sql`
        UPDATE ai_tasks
        SET status = 'completed',
            result = ${JSON.stringify(result || {})},
            completed_at = NOW()
        WHERE id = ${id}`;
    } else if (status === 'failed') {
      await sql`
        UPDATE ai_tasks
        SET status = 'failed',
            error = ${taskError || 'Unknown error'},
            completed_at = NOW()
        WHERE id = ${id}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
