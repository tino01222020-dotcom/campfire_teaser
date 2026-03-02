import { NextResponse } from 'next/server';
import { migrate } from '@/lib/db';

// POST /api/setup — run DB migration
export async function POST(request) {
  try {
    // Simple auth: require a secret header
    const auth = request.headers.get('x-setup-key');
    if (auth !== (process.env.SETUP_SECRET || 'crowdfuel-setup-2026')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await migrate();
    return NextResponse.json({ ...result, message: 'Migration completed' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
