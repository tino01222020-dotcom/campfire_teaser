import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSequenceStats } from '@/lib/nurture-engine';

// GET /api/sequences — list sequences with stats
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get('phase');

  try {
    const stats = await getSequenceStats();
    const filtered = phase ? stats.filter(s => s.phase === phase) : stats;
    return NextResponse.json({ sequences: filtered });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/sequences — create a new sequence
export async function POST(request) {
  try {
    const { name, channel, delay_hours = 0, trigger_type = 'delay', content, subject, phase = 'lead', campaign, status = 'draft' } = await request.json();
    if (!name || !channel) return NextResponse.json({ error: 'name and channel required' }, { status: 400 });

    const { rows } = await sql`
      INSERT INTO sequences (name, channel, delay_hours, trigger_type, content, subject, phase, campaign, status, sort_order)
      VALUES (${name}, ${channel}, ${delay_hours}, ${trigger_type}, ${content}, ${subject}, ${phase}, ${campaign}, ${status},
        COALESCE((SELECT MAX(sort_order) + 1 FROM sequences WHERE phase = ${phase}), 0))
      RETURNING *`;

    return NextResponse.json({ success: true, sequence: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/sequences — update a sequence
export async function PATCH(request) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const allowed = ['name', 'channel', 'delay_hours', 'content', 'subject', 'status', 'sort_order'];
    const fields = Object.keys(updates).filter(k => allowed.includes(k));

    for (const field of fields) {
      await sql.query(`UPDATE sequences SET ${field} = $1 WHERE id = $2`, [updates[field], id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
