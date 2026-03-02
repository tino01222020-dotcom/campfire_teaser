import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/export/leads — download leads as CSV
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const phase = searchParams.get('phase') || 'lead';

  try {
    const { rows } = await sql`
      SELECT id, email, line_user_id, channel, source_lp, campaign, phase,
             utm_source, utm_medium, utm_campaign, created_at
      FROM leads
      WHERE phase = ${phase}
      ORDER BY created_at DESC`;

    const headers = ['id', 'email', 'line_user_id', 'channel', 'source_lp', 'campaign', 'phase', 'utm_source', 'utm_medium', 'utm_campaign', 'created_at'];
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      csvRows.push(headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','));
    }

    const csv = csvRows.join('\n');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads_${phase}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
