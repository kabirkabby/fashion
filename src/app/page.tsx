'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Factory,
  Layers,
  Package,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useAkoya } from '@/context/AkoyaContext';
import { AvatarBadge } from '@/components/ui/AvatarBadge';
import { PASTEL_THEMES, uid } from '@/lib/themes';
import { addDaysIso, formatDisplayDate, formatRelativeDate } from '@/lib/dateUtils';
import { Collection } from '@/types/akoya';

export default function HomeDashboardPage() {
  const { store, today, updateStore, reorderRecommendations } = useAkoya();

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'tasks' | 'skus'>('tasks');
  const [quickTaskText, setQuickTaskText] = useState('');

  const activeMember = useMemo(
    () => store.team.find((m) => m.id === store.profile.activeMemberId) || store.team[0],
    [store.team, store.profile.activeMemberId]
  );

  const selectedCollection: Collection | undefined = useMemo(
    () =>
      store.collections.find((c) => c.id === selectedCollectionId) || store.collections[0],
    [store.collections, selectedCollectionId]
  );

  const pendingReminders = useMemo(
    () =>
      store.reminders
        .filter((r) => r.status === 'pending')
        .sort((a, b) => `${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`)),
    [store.reminders]
  );

  const urgentReorders = useMemo(
    () =>
      reorderRecommendations.filter(
        (r) => r.urgency === 'critical' || r.urgency === 'recommended'
      ),
    [reorderRecommendations]
  );

  const activeTasks = useMemo(
    () => store.tasks.slice(0, 6),
    [store.tasks]
  );

  const avgMarginPct = useMemo(() => {
    if (store.skus.length === 0) return 0;
    const total = store.skus.reduce((acc, s) => {
      if (!s.targetRetailPrice) return acc;
      return acc + ((s.targetRetailPrice - s.targetCogs) / s.targetRetailPrice) * 100;
    }, 0);
    return Math.round(total / store.skus.length);
  }, [store.skus]);

  const toggleTaskDone = (taskId: string) => {
    updateStore((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, status: t.status === 'Done' ? 'In Progress' : 'Done' } : t
      ),
    }));
  };

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskText.trim()) return;
    updateStore(
      (prev) => ({
        ...prev,
        tasks: [
          {
            id: uid('tsk'),
            title: quickTaskText.trim(),
            description: '',
            status: 'Not Started',
            priority: 'Medium',
            dueDate: addDaysIso(today, 2),
            assigneeId: activeMember?.id || prev.team[0]?.id || 'tm-1',
            collectionId: selectedCollection?.id,
            checklist: [],
          },
          ...prev.tasks,
        ],
      }),
      'Task added to brand checklist'
    );
    setQuickTaskText('');
  };

  const todayParts = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return {
      weekday: dt.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' }),
      month: dt.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' }),
      day: d,
      year: y,
    };
  }, [today]);

  const vendorCounts = useMemo(() => {
    const mfgs = store.vendors.filter((v) => v.kind === 'manufacturer');
    const sups = store.vendors.filter((v) => v.kind === 'supplier');
    const samplingMfg = mfgs.filter((v) => v.stageId.includes('sampling')).length;
    const activeMfg = mfgs.filter((v) => v.stageId.includes('manufacturing')).length;
    return { mfgs: mfgs.length, sups: sups.length, samplingMfg, activeMfg };
  }, [store.vendors]);

  return (
    <div className="space-y-6">
      {/* Greeting Header (Sample 2 style) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1A18] sm:text-[28px]">
            Hi, {activeMember?.name.split(' ')[0] || 'Founder'}
          </h1>
          <p className="mt-0.5 text-sm text-[#6E6C66]">
            {formatDisplayDate(today, { weekday: true, includeYear: true })} ·{' '}
            {store.profile.brandName} Command Center
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/manufacturers"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#DFDCD3] bg-white px-4 text-xs font-semibold text-[#1B1A18] transition hover:bg-[#F3F2EE]"
          >
            <Factory className="h-3.5 w-3.5" />
            Track Manufacturers
          </Link>
          <Link
            href="/collections"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#1C1B19] px-5 text-xs font-semibold text-white transition hover:bg-[#32302C]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Collection / SKU
          </Link>
        </div>
      </div>

      {/* Urgent Reorder Alert Banner when stock is low & orders are flowing */}
      {urgentReorders.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[24px] border border-[#F0CFC7] bg-[#FDF1EE] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#D94E3B] text-white">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[#6E2218]">
                  Smart Reorder Alert · {urgentReorders.length} SKU
                  {urgentReorders.length > 1 ? 's' : ''} need restock PO
                </span>
                <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#9C3325]">
                  Low stock + strong order velocity
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#7E342A]">
                {urgentReorders[0].sku.skuCode} ({urgentReorders[0].sku.name}):{' '}
                {urgentReorders[0].reason}
              </p>
            </div>
          </div>
          <Link
            href="/inventory"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1C1B19] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#32302C]"
          >
            Review & Place PO <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Top Bento Grid (Sample 1 inspired) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Card 1: Sunlit Gold Priority To-Do Card */}
        <section className="overflow-hidden rounded-[28px] border border-[#E6E3DA] bg-white lg:col-span-5">
          <div className="flex items-center justify-between bg-[#F7D147] px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1B1A18]">
                {todayParts.weekday}, {todayParts.day} {todayParts.month}
              </span>
              <span className="rounded-full bg-[#1B1A18]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1B1A18]">
                Brand Focus
              </span>
            </div>
            <Link
              href="/tasks"
              className="text-xs font-semibold text-[#1B1A18] underline-offset-2 hover:underline"
            >
              All Tasks →
            </Link>
          </div>

          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1B1A18]">Launch To-Do List</h2>
                <div className="flex -space-x-1">
                  {store.team.slice(0, 3).map((m) => (
                    <AvatarBadge key={m.id} member={m} size="xs" />
                  ))}
                </div>
              </div>
              <span className="rounded-full bg-[#F3F2EE] px-2.5 py-1 text-[11px] font-medium text-[#5A5852]">
                {store.tasks.filter((t) => t.status === 'Done').length}/{store.tasks.length} Done
              </span>
            </div>

            <div className="space-y-2">
              {activeTasks.map((task) => {
                const done = task.status === 'Done';
                const member = store.team.find((m) => m.id === task.assigneeId);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-[#F0EDE6] bg-[#FAF9F6] px-3 py-2.5 transition hover:border-[#DFDCD3]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTaskDone(task.id)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <span
                        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition ${
                          done
                            ? 'border-[#1C1B19] bg-[#1C1B19] text-white'
                            : 'border-[#C8C4BA] bg-white'
                        }`}
                      >
                        {done && <Check className="h-3 w-3" />}
                      </span>
                      <span
                        className={`truncate text-xs font-medium ${
                          done ? 'text-[#8E8B83] line-through' : 'text-[#1B1A18]'
                        }`}
                      >
                        {task.title}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          task.priority === 'High'
                            ? 'bg-[#FDE2DD] text-[#A8382B]'
                            : task.priority === 'Medium'
                            ? 'bg-[#FCF0C2] text-[#845E07]'
                            : 'bg-[#DFF2E6] text-[#1F6B43]'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <AvatarBadge member={member} size="xs" />
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleQuickAddTask} className="mt-3 flex gap-2">
              <input
                value={quickTaskText}
                onChange={(e) => setQuickTaskText(e.target.value)}
                placeholder="Quick add a brand task..."
                aria-label="Quick add a brand task"
                className="h-9 flex-1 rounded-xl border border-[#E5E2DA] bg-[#FAF9F6] px-3 text-xs focus:border-[#1C1B19] focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#1C1B19] px-3.5 text-xs font-semibold text-white hover:bg-[#33312D]"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </form>
          </div>
        </section>

        {/* Card 2: Follow-up Reminders + Today Date Tile (Sample 1 center) */}
        <section className="flex flex-col gap-4 lg:col-span-3">
          <div className="flex-1 rounded-[28px] border border-[#E6E3DA] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-[#C88A18]" />
                <h2 className="text-sm font-bold text-[#1B1A18]">Follow-up Reminders</h2>
              </div>
              <span className="rounded-full bg-[#1C1B19] px-2 py-0.5 text-[10px] font-semibold text-white">
                {pendingReminders.length}
              </span>
            </div>

            <div className="space-y-2">
              {pendingReminders.length === 0 ? (
                <div className="rounded-2xl bg-[#FAF9F6] p-4 text-center text-xs text-[#75726B]">
                  No pending follow-ups.
                </div>
              ) : (
                pendingReminders.slice(0, 3).map((rem) => {
                  const rel = formatRelativeDate(rem.dueDate, today);
                  const assignee = store.team.find((m) => m.id === rem.assigneeId);
                  return (
                    <div
                      key={rem.id}
                      className="flex items-center justify-between gap-2 rounded-2xl border border-[#F0EDE6] bg-[#FAF9F6] p-2.5"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateStore(
                            (prev) => ({
                              ...prev,
                              reminders: prev.reminders.map((r) =>
                                r.id === rem.id ? { ...r, status: 'done' } : r
                              ),
                            }),
                            'Reminder marked done'
                          )
                        }
                        title="Mark reminder done"
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#C8C4BA] bg-white text-transparent hover:border-[#1C1B19] hover:text-[#1C1B19]"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-[#1B1A18]">
                          {rem.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#75726B]">
                          <span
                            className={
                              rel.tone === 'overdue'
                                ? 'font-semibold text-[#B93829]'
                                : rel.tone === 'today'
                                ? 'font-semibold text-[#9B6B08]'
                                : ''
                            }
                          >
                            {rel.label}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {rem.dueTime}
                          </span>
                        </div>
                      </div>
                      <AvatarBadge member={assignee} size="xs" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Crisp Day Tile from Sample 1 */}
          <Link
            href="/calendar"
            className="flex items-center justify-between rounded-[28px] border border-[#E6E3DA] bg-white px-5 py-4 transition hover:border-[#CBC7BC]"
          >
            <div>
              <div className="text-xs font-medium text-[#75726B]">
                {todayParts.weekday}, {todayParts.month}
              </div>
              <div className="mt-0.5 text-4xl font-bold tracking-tight text-[#1B1A18] tabular-nums">
                {todayParts.day}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F2EE] px-2.5 py-1 text-[11px] font-semibold text-[#1B1A18]">
                <Calendar className="h-3 w-3" />
                {store.calendarEvents.filter((e) => e.date >= today).length} upcoming
              </span>
              <div className="mt-1.5 text-[11px] text-[#75726B]">View timeline →</div>
            </div>
          </Link>
        </section>

        {/* Card 3: Sourcing, Margin & Team Collaboration Card */}
        <section className="flex flex-col justify-between rounded-[28px] border border-[#E6E3DA] bg-white p-5 lg:col-span-4">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1B1A18]">Brand Pulse & Team</h2>
              <Link
                href="/team"
                className="text-xs font-semibold text-[#5A5852] hover:text-[#1B1A18]"
              >
                Manage Team →
              </Link>
            </div>

            {/* Compact KPI tiles */}
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/manufacturers"
                className="rounded-2xl border border-[#EDEAE2] bg-[#FAF9F6] p-3 transition hover:border-[#D3CFC5]"
              >
                <div className="flex items-center justify-between text-[11px] text-[#75726B]">
                  <span>Manufacturers</span>
                  <Factory className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 text-2xl font-bold text-[#1B1A18] tabular-nums">
                  {vendorCounts.mfgs}
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-[#2B8A57]">
                  {vendorCounts.activeMfg} manufacturing · {vendorCounts.samplingMfg} sampling
                </div>
              </Link>

              <Link
                href="/suppliers"
                className="rounded-2xl border border-[#EDEAE2] bg-[#FAF9F6] p-3 transition hover:border-[#D3CFC5]"
              >
                <div className="flex items-center justify-between text-[11px] text-[#75726B]">
                  <span>Material Suppliers</span>
                  <Package className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 text-2xl font-bold text-[#1B1A18] tabular-nums">
                  {vendorCounts.sups}
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-[#6E6C66]">
                  Fabrics, trims, labels
                </div>
              </Link>

              <Link
                href="/collections"
                className="rounded-2xl border border-[#EDEAE2] bg-[#FAF9F6] p-3 transition hover:border-[#D3CFC5]"
              >
                <div className="flex items-center justify-between text-[11px] text-[#75726B]">
                  <span>Avg Target Margin</span>
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 text-2xl font-bold text-[#1B1A18] tabular-nums">
                  {avgMarginPct}%
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-[#6E6C66]">
                  Across {store.skus.length} SKUs
                </div>
              </Link>

              <Link
                href="/inventory"
                className="rounded-2xl border border-[#EDEAE2] bg-[#FAF9F6] p-3 transition hover:border-[#D3CFC5]"
              >
                <div className="flex items-center justify-between text-[11px] text-[#75726B]">
                  <span>Active POs</span>
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <div className="mt-1 text-2xl font-bold text-[#1B1A18] tabular-nums">
                  {store.purchaseOrders.length}
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-[#6E6C66]">
                  {urgentReorders.length} reorder alerts
                </div>
              </Link>
            </div>
          </div>

          {/* Active Team Strip */}
          <div className="mt-4 rounded-2xl border border-[#EDEAE2] bg-[#FAF9F6] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#5A5852]">
                Team Collaboration ({store.team.length})
              </span>
              <span className="text-[10px] text-[#75726B]">Active today</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {store.team.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-1.5 ring-1 ring-[#EAE7DF]"
                >
                  <AvatarBadge member={m} size="xs" showStatus />
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-semibold text-[#1B1A18]">
                      {m.name.split(' ')[0]}
                    </div>
                    <div className="truncate text-[10px] text-[#75726B]">
                      {m.role.split('&')[0].trim()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Collections + Split Detail Inspector (Sample 2 signature layout!) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Pastel Collection Cards */}
        <div className="space-y-3 xl:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1B1A18]">Collections & Drops</h2>
              <p className="text-xs text-[#6E6C66]">
                Click any collection card to inspect its SKUs, milestones, and tasks.
              </p>
            </div>
            <Link
              href="/collections"
              className="text-xs font-semibold text-[#1B1A18] hover:underline"
            >
              Open Full Catalog →
            </Link>
          </div>

          {store.collections.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#D5D1C7] bg-white p-10 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-[#96938B]" />
              <h3 className="mt-2 text-sm font-semibold text-[#1B1A18]">No collections yet</h3>
              <p className="mt-1 text-xs text-[#75726B]">
                Create your first Drop or Capsule in Collections & SKUs to track garments from tech pack to launch.
              </p>
              <Link
                href="/collections"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1C1B19] px-4 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Create Collection
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {store.collections.map((col) => {
                const theme = PASTEL_THEMES[col.theme] || PASTEL_THEMES.peach;
                const colTasks = store.tasks.filter((t) => t.collectionId === col.id);
                const doneTasks = colTasks.filter((t) => t.status === 'Done').length;
                const colSkus = store.skus.filter((s) => s.collectionId === col.id);
                const pct =
                  colTasks.length > 0
                    ? Math.round((doneTasks / colTasks.length) * 100)
                    : colSkus.length > 0
                    ? 40
                    : 10;
                const isSelected = selectedCollection?.id === col.id;

                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedCollectionId(col.id)}
                    className={`group flex flex-col justify-between rounded-[26px] border p-5 text-left transition ${
                      theme.cardBg
                    } ${theme.cardBorder} ${
                      isSelected ? 'ring-2 ring-[#1C1B19]' : 'hover:brightness-[0.98]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-[#1B1A18]">{col.name}</h3>
                        <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold text-[#3C3A36]">
                          {col.priority}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
                          <div
                            className="h-full rounded-full bg-[#1C1B19] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-[#1B1A18] tabular-nums">
                          {pct}%
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[#4C4A45]">
                        {col.description}
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/75 px-3 py-2 text-[11px] font-medium text-[#3C3A36]">
                        <span>{colSkus.length} SKUs · {colTasks.length - doneTasks} tasks left</span>
                        <span>Launch: {formatDisplayDate(col.launchDate)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {col.leadMemberIds.slice(0, 2).map((mid) => {
                          const m = store.team.find((tm) => tm.id === mid);
                          if (!m) return null;
                          const mTasks = colTasks.filter((t) => t.assigneeId === m.id);
                          const mDone = mTasks.filter((t) => t.status === 'Done').length;
                          const mPct =
                            mTasks.length > 0 ? Math.round((mDone / mTasks.length) * 100) : 100;
                          return (
                            <div
                              key={m.id}
                              className="flex items-center gap-2 rounded-xl bg-white/80 px-2.5 py-2"
                            >
                              <AvatarBadge member={m} size="xs" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-[#1B1A18]">
                                  <span className="truncate">{m.name.split(' ')[0]}</span>
                                  <span>{mPct}%</span>
                                </div>
                                <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/10">
                                  <div
                                    className="h-full rounded-full bg-[#1C1B19]"
                                    style={{ width: `${mPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Split Detail Inspector Panel (Sample 2 style) */}
        <aside className="rounded-[28px] border border-[#E6E3DA] bg-white p-6 xl:col-span-5">
          {selectedCollection ? (
            (() => {
              const colTasks = store.tasks.filter(
                (t) => t.collectionId === selectedCollection.id
              );
              const doneTasks = colTasks.filter((t) => t.status === 'Done').length;
              const colSkus = store.skus.filter(
                (s) => s.collectionId === selectedCollection.id
              );
              const pct =
                colTasks.length > 0
                  ? Math.round((doneTasks / colTasks.length) * 100)
                  : colSkus.length > 0
                  ? 40
                  : 10;

              return (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F2EE] px-2.5 py-0.5 text-[11px] font-semibold text-[#5A5852]">
                        {selectedCollection.code} · {selectedCollection.season}
                      </span>
                      <h3 className="mt-2 text-xl font-bold text-[#1B1A18]">
                        {selectedCollection.name}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#6E6C66]">
                        {selectedCollection.description}
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-[#1B1A18] tabular-nums">{pct}%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#EFECE6]">
                    <div
                      className="h-full rounded-full bg-[#1C1B19] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#EFECE6] bg-[#FAF9F6] p-3">
                    <div>
                      <div className="text-[10px] font-medium text-[#75726B]">Start Date</div>
                      <div className="mt-0.5 text-xs font-semibold text-[#1B1A18]">
                        {formatDisplayDate(selectedCollection.startDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium text-[#75726B]">Target Launch</div>
                      <div className="mt-0.5 text-xs font-semibold text-[#1B1A18]">
                        {formatDisplayDate(selectedCollection.launchDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium text-[#75726B]">Milestone</div>
                      <div className="mt-0.5 truncate text-xs font-semibold text-[#1B1A18]">
                        {selectedCollection.milestoneLabel}
                      </div>
                    </div>
                  </div>

                  {/* Members */}
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A877F]">
                      Collection Leads
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedCollection.leadMemberIds.map((mid) => {
                        const m = store.team.find((tm) => tm.id === mid);
                        if (!m) return null;
                        return (
                          <div
                            key={m.id}
                            className="flex items-center gap-2 rounded-full border border-[#EAE7DF] bg-[#FAF9F6] py-1 pl-1 pr-3"
                          >
                            <AvatarBadge member={m} size="xs" />
                            <span className="text-xs font-medium text-[#1B1A18]">{m.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tab Switcher */}
                  <div className="flex items-center gap-2 border-b border-[#EFECE6] pb-3">
                    <button
                      type="button"
                      onClick={() => setInspectorTab('tasks')}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        inspectorTab === 'tasks'
                          ? 'bg-[#1C1B19] text-white'
                          : 'bg-[#F3F2EE] text-[#5A5852] hover:text-[#1B1A18]'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Tasks ({colTasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorTab('skus')}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        inspectorTab === 'skus'
                          ? 'bg-[#1C1B19] text-white'
                          : 'bg-[#F3F2EE] text-[#5A5852] hover:text-[#1B1A18]'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      SKUs ({colSkus.length})
                    </button>
                  </div>

                  {inspectorTab === 'tasks' ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {colTasks.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[#8A877F]">
                          No tasks linked to this collection yet.
                        </p>
                      ) : (
                        colTasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[#F0EDE6] px-3 py-2 text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => toggleTaskDone(t.id)}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${
                                  t.status === 'Done'
                                    ? 'bg-emerald-500'
                                    : t.status === 'In Progress'
                                    ? 'bg-amber-400'
                                    : 'bg-stone-300'
                                }`}
                              />
                              <span
                                className={`truncate font-medium ${
                                  t.status === 'Done'
                                    ? 'text-[#8E8B83] line-through'
                                    : 'text-[#1B1A18]'
                                }`}
                              >
                                {t.title}
                              </span>
                            </button>
                            <span className="shrink-0 text-[11px] text-[#75726B]">
                              {formatDisplayDate(t.dueDate)}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                t.priority === 'High'
                                  ? 'bg-[#FDE2DD] text-[#A8382B]'
                                  : t.priority === 'Medium'
                                  ? 'bg-[#FCF0C2] text-[#845E07]'
                                  : 'bg-[#DFF2E6] text-[#1F6B43]'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {colSkus.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[#8A877F]">
                          No SKUs added to this collection yet.
                        </p>
                      ) : (
                        colSkus.map((sku) => (
                          <Link
                            key={sku.id}
                            href="/collections"
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#F0EDE6] p-2.5 transition hover:bg-[#FAF9F6]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={sku.images[0] || '/garments/tee.svg'}
                                alt={sku.name}
                                className="h-10 w-10 rounded-lg border border-[#EAE7DF] object-cover"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-[#1B1A18]">
                                  {sku.name}
                                </div>
                                <div className="font-mono text-[10px] text-[#75726B]">
                                  {sku.skuCode} · {sku.colorway}
                                </div>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-[#F3F2EE] px-2.5 py-0.5 text-[10px] font-semibold text-[#3C3A36]">
                              {sku.status}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="py-12 text-center text-xs text-[#75726B]">
              Select or create a collection to inspect its progress.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
