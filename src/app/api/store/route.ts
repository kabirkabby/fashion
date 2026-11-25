import { NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/storeServer';
import { isSupabaseConfigured } from '@/lib/supabaseAdmin';
import { AkoyaStore } from '@/types/akoya';

export async function GET() {
  try {
    const store = await readStore();
    return NextResponse.json(store, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error('Failed to read Akoya store:', details);
    return NextResponse.json(
      {
        error: 'Failed to load workspace data',
        storageMode: isSupabaseConfigured() ? 'supabase' : 'local-fs',
        details,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as AkoyaStore;
    if (!body || !body.profile || !Array.isArray(body.vendors)) {
      return NextResponse.json({ error: 'Invalid store payload' }, { status: 400 });
    }
    const saved = await writeStore(body);
    return NextResponse.json(saved);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error('Failed to save Akoya store:', details);
    return NextResponse.json(
      {
        error: 'Failed to persist workspace data',
        storageMode: isSupabaseConfigured() ? 'supabase' : 'local-fs',
        details,
      },
      { status: 500 }
    );
  }
}
