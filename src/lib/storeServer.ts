import { promises as fs } from 'fs';
import path from 'path';
import { AkoyaStore } from '@/types/akoya';
import { createEmptyStore, createSeedStore } from '@/lib/seedData';

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'akoya-store.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readStore(): Promise<AkoyaStore> {
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
  await ensureDataDir();
  const tmpPath = `${STORE_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(tmpPath, STORE_PATH);
  return store;
}

export async function resetStore(mode: 'demo' | 'blank'): Promise<AkoyaStore> {
  const next = mode === 'blank' ? createEmptyStore() : createSeedStore();
  return writeStore(next);
}
