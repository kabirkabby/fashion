import { NextResponse } from 'next/server';
import { resetStore } from '@/lib/storeServer';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { mode?: 'demo' | 'blank' };
    const mode = body?.mode === 'blank' ? 'blank' : 'demo';
    const next = await resetStore(mode);
    return NextResponse.json(next);
  } catch (error) {
    console.error('Failed to reset Akoya store:', error);
    return NextResponse.json({ error: 'Failed to reset workspace' }, { status: 500 });
  }
}
