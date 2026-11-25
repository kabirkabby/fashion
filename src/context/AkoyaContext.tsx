'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AkoyaStore } from '@/types/akoya';
import { createEmptyStore } from '@/lib/seedData';
import { getTodayIso } from '@/lib/dateUtils';
import { evaluateReorderRecommendations, ReorderRecommendation } from '@/lib/reorderEngine';

interface ToastMessage {
  id: string;
  text: string;
  tone?: 'neutral' | 'success' | 'warning';
}

interface AkoyaContextValue {
  store: AkoyaStore;
  today: string;
  loading: boolean;
  saving: boolean;
  updateStore: (updater: (prev: AkoyaStore) => AkoyaStore, toastText?: string) => void;
  resetWorkspace: (mode: 'demo' | 'blank') => Promise<void>;
  reorderRecommendations: ReorderRecommendation[];
  pendingRemindersCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  notify: (text: string, tone?: ToastMessage['tone']) => void;
}

const AkoyaContext = createContext<AkoyaContextValue | null>(null);

export function AkoyaProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<AkoyaStore>(() => createEmptyStore());
  const [today, setToday] = useState<string>('2026-11-25');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/store', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load store');
        return res.json() as Promise<AkoyaStore>;
      })
      .then((data) => {
        if (active) {
          setToday(getTodayIso());
          setStore(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setToday(getTodayIso());
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const persistStore = useCallback((nextStore: AkoyaStore) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/store', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextStore),
        });
      } catch (e) {
        console.error('Persist failed:', e);
      } finally {
        setSaving(false);
      }
    }, 150);
  }, []);

  const updateStore = useCallback(
    (updater: (prev: AkoyaStore) => AkoyaStore, toastText?: string) => {
      setStore((prev) => {
        const next = updater(prev);
        persistStore(next);
        return next;
      });
      if (toastText) notify(toastText, 'success');
    },
    [persistStore, notify]
  );

  const resetWorkspace = useCallback(
    async (mode: 'demo' | 'blank') => {
      setSaving(true);
      try {
        const res = await fetch('/api/store/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
        if (res.ok) {
          const next = (await res.json()) as AkoyaStore;
          setStore(next);
          notify(
            mode === 'blank' ? 'Workspace cleared to start fresh' : 'Demo clothing brand data restored',
            'neutral'
          );
        }
      } finally {
        setSaving(false);
      }
    },
    [notify]
  );

  const reorderRecommendations = useMemo(
    () => evaluateReorderRecommendations(store.inventory, store.skus, store.vendors),
    [store.inventory, store.skus, store.vendors]
  );

  const pendingRemindersCount = useMemo(
    () => store.reminders.filter((r) => r.status === 'pending').length,
    [store.reminders]
  );

  return (
    <AkoyaContext.Provider
      value={{
        store,
        today,
        loading,
        saving,
        updateStore,
        resetWorkspace,
        reorderRecommendations,
        pendingRemindersCount,
        searchQuery,
        setSearchQuery,
        notify,
      }}
    >
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-[#E2DFD7] bg-[#1C1B19] px-4 py-2.5 text-sm font-medium text-white shadow-lg"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  t.tone === 'warning' ? 'bg-[#F7D147]' : 'bg-[#6ED39A]'
                }`}
              />
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </AkoyaContext.Provider>
  );
}

export function useAkoya() {
  const ctx = useContext(AkoyaContext);
  if (!ctx) throw new Error('useAkoya must be used inside AkoyaProvider');
  return ctx;
}
