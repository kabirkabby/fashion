import { promises as fs } from 'fs';
import path from 'path';
import { AkoyaStore } from '@/types/akoya';
import { createEmptyStore, createSeedStore } from '@/lib/seedData';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const WORKSPACE_ID = 'default';
const TABLE_NAME = 'akoya_workspaces';

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'akoya-store.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readStore(): Promise<AkoyaStore> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('data')
      .eq('id', WORKSPACE_ID)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase read failed: ${error.message}`);
    }

    if (data?.data) {
      return data.data as AkoyaStore;
    }

    const initial = createSeedStore();
    await writeStore(initial);
    return initial;
  }

  // Local filesystem fallback when Supabase env vars are not configured
  await ensureDataDir();
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    return JSON.parse(raw) as AkoyaStore;
  } catch {
    const initial = createSeedStore();
    await writeStore(initial);
    return initial;
  }
}

export async function writeStore(store: AkoyaStore): Promise<AkoyaStore> {
  const payload: AkoyaStore = { ...store, _updatedAt: store._updatedAt || Date.now() };
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const { error } = await supabase.from(TABLE_NAME).upsert(
      {
        id: WORKSPACE_ID,
        data: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      throw new Error(`Supabase write failed: ${error.message}`);
    }
    return payload;
  }

  await ensureDataDir();
  const tmpPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
  await fs.rename(tmpPath, STORE_PATH);
  return payload;
}

export async function resetStore(mode: 'demo' | 'blank'): Promise<AkoyaStore> {
  const next = {
    ...(mode === 'blank' ? createEmptyStore() : createSeedStore()),
    _updatedAt: Date.now(),
  };
  return writeStore(next);
}
