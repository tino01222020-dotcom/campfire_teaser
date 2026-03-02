import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSendGridCredentials, sendWelcomeEmail } from '@/lib/integrations/sendgrid';

// POST /api/leads — register a new lead from LP
export async function POST(request) {
  try {
    const { email, channel = 'email', source_lp, campaign, phase = 'lead',
            utm_source, utm_medium, utm_campaign } = await request.json();

    if (!email && channel === 'email') {
      return NextResponse.json({ error: 'email required' }, { status: 400 });
    }

    // Check duplicate
    if (email) {
      const { rows } = await sql`SELECT id FROM leads WHERE email = ${email} AND source_lp = ${source_lp}`;
      if (rows.length > 0) {
        return NextResponse.json({ success: true, duplicate: true, id: rows[0].id });
      }
    }

    // Insert lead
    const { rows } = await sql`
      INSERT INTO leads (email, channel, source_lp, campaign, phase, utm_source, utm_medium, utm_campaign)
      VALUES (${email}, ${channel}, ${source_lp}, ${campaign}, ${phase},
              ${utm_source || null}, ${utm_medium || null}, ${utm_campaign || null})
      RETURNING id, created_at`;

    const leadId = rows[0]?.id;

    // Send welcome email
    if (email && channel === 'email') {
      try {
        const sgCreds = await getSendGridCredentials();
        if (sgCreds) {
          await sendWelcomeEmail(email, campaign || 'プロジェクト', sgCreds);
        }
      } catch (e) {
        console.error('Welcome email failed:', e);
      }
    }

    // CORS headers for LP cross-origin requests
    return NextResponse.json(
      { success: true, id: leadId },
      { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// GET /api/leads — get lead stats
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get('phase') || 'lead';
  const days = parseInt(searchParams.get('days') || '14');

  try {
    // Total counts
    const { rows: totals } = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE channel = 'line') as line_count,
        COUNT(*) FILTER (WHERE channel = 'email') as email_count
      FROM leads WHERE phase = ${phase}`;

    // Daily breakdown
    const { rows: daily } = await sql`
      SELECT
        date_trunc('day', created_at)::date as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE channel = 'line') as line_count,
        COUNT(*) FILTER (WHERE channel = 'email') as email_count
      FROM leads
      WHERE phase = ${phase} AND created_at > NOW() - (${days} || ' days')::interval
      GROUP BY date_trunc('day', created_at)
      ORDER BY date`;

    // By source LP
    const { rows: bySource } = await sql`
      SELECT source_lp, COUNT(*) as count
      FROM leads WHERE phase = ${phase}
      GROUP BY source_lp ORDER BY count DESC LIMIT 10`;

    return NextResponse.json({
      totals: totals[0],
      daily,
      by_source: bySource,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
