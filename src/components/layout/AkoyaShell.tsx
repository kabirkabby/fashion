'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Boxes,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  Factory,
  Home,
  Layers,
  Menu,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useAkoya } from '@/context/AkoyaContext';
import { AvatarBadge } from '@/components/ui/AvatarBadge';
import { addDaysIso, formatDisplayDate, formatRelativeDate } from '@/lib/dateUtils';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { uid } from '@/lib/themes';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeTone?: 'alert' | 'neutral';
}

export function AkoyaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    store,
    today,
    saving,
    updateStore,
    resetWorkspace,
    reorderRecommendations,
    pendingRemindersCount,
    searchQuery,
    setSearchQuery,
  } = useAkoya();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [quickReminderOpen, setQuickReminderOpen] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);

  // Quick reminder form state
  const [remTitle, setRemTitle] = useState('');
  const [remPrompt, setRemPrompt] = useState('');
  const [remDate, setRemDate] = useState(addDaysIso(today, 2));
  const [remTime, setRemTime] = useState('10:00');
  const [remTargetType, setRemTargetType] = useState<'manufacturer' | 'supplier' | 'sku' | 'general'>('manufacturer');
  const [remTargetId, setRemTargetId] = useState('');
  const [remPriority, setRemPriority] = useState<'high' | 'medium' | 'low'>('high');

  const activeMember = useMemo(
    () => store.team.find((m) => m.id === store.profile.activeMemberId) || store.team[0],
    [store.team, store.profile.activeMemberId]
  );

  const urgentReorderCount = useMemo(
    () =>
      reorderRecommendations.filter((r) => r.urgency === 'critical' || r.urgency === 'recommended')
        .length,
    [reorderRecommendations]
  );

  const pendingReminders = useMemo(
    () =>
      store.reminders
        .filter((r) => r.status === 'pending')
        .sort((a, b) => `${a.dueDate} ${a.dueTime}`.localeCompare(`${b.dueDate} ${b.dueTime}`)),
    [store.reminders]
  );

  const overdueRemindersCount = useMemo(
    () => pendingReminders.filter((r) => r.dueDate <= today).length,
    [pendingReminders, today]
  );

  const primaryGroups: { heading: string; items: NavItem[] }[] = [
    {
      heading: 'Brand Workspace',
      items: [
        { href: '/', label: 'Home', icon: Home },
        { href: '/collections', label: 'Collections & SKUs', icon: Layers, badge: store.skus.length },
        {
          href: '/manufacturers',
          label: 'Manufacturers',
          icon: Factory,
          badge: store.vendors.filter((v) => v.kind === 'manufacturer').length,
        },
        {
          href: '/suppliers',
          label: 'Suppliers',
          icon: PackageCheck,
          badge: store.vendors.filter((v) => v.kind === 'supplier').length,
        },
        {
          href: '/inventory',
          label: 'Inventory',
          icon: Boxes,
          badge: urgentReorderCount > 0 ? `${urgentReorderCount} low` : undefined,
          badgeTone: urgentReorderCount > 0 ? 'alert' : 'neutral',
        },
      ],
    },
    {
      heading: 'Execution',
      items: [
        {
          href: '/tasks',
          label: 'Tasks',
          icon: CheckSquare,
          badge: store.tasks.filter((t) => t.status !== 'Done').length,
        },
        { href: '/calendar', label: 'Calendar', icon: CalendarDays },
        { href: '/team', label: 'Team', icon: Users, badge: store.team.length },
      ],
    },
    {
      heading: 'Integrations',
      items: [{ href: '/shopify', label: 'Shopify Sync', icon: ShoppingBag, badge: 'Soon' }],
    },
  ];

  // Live global search matches
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matches: { id: string; kind: string; title: string; subtitle: string; href: string }[] = [];

    for (const v of store.vendors) {
      if (
        v.companyName.toLowerCase().includes(q) ||
        v.contactName.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)
      ) {
        matches.push({
          id: v.id,
          kind: v.kind === 'manufacturer' ? 'Manufacturer' : 'Supplier',
          title: v.companyName,
          subtitle: `${v.contactName} · ${v.location}`,
          href: v.kind === 'manufacturer' ? '/manufacturers' : '/suppliers',
        });
      }
    }
    for (const s of store.skus) {
      if (
        s.name.toLowerCase().includes(q) ||
        s.skuCode.toLowerCase().includes(q) ||
        s.colorway.toLowerCase().includes(q)
      ) {
        matches.push({
          id: s.id,
          kind: 'SKU',
          title: `${s.skuCode} · ${s.name}`,
          subtitle: `${s.colorway} · ${s.status}`,
          href: '/collections',
        });
      }
    }
    for (const t of store.tasks) {
      if (t.title.toLowerCase().includes(q)) {
        matches.push({
          id: t.id,
          kind: 'Task',
          title: t.title,
          subtitle: `${t.status} · ${t.priority}`,
          href: '/tasks',
        });
      }
    }
    return matches.slice(0, 7);
  }, [searchQuery, store.vendors, store.skus, store.tasks]);

  const handleSaveQuickReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remTitle.trim()) return;
    updateStore(
      (prev) => ({
        ...prev,
        reminders: [
          {
            id: uid('rem'),
            title: remTitle.trim(),
            askStatusPrompt: remPrompt.trim() || 'Check current progress & request timeline update.',
            dueDate: remDate,
            dueTime: remTime,
            targetType: remTargetType,
            targetId: remTargetId || undefined,
            assigneeId: activeMember?.id || prev.team[0]?.id || 'tm-1',
            status: 'pending',
            priority: remPriority,
          },
          ...prev.reminders,
        ],
      }),
      'Follow-up reminder scheduled'
    );
    setRemTitle('');
    setRemPrompt('');
    setQuickReminderOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between px-3.5 py-4">
      <div className="space-y-5">
        {/* Brand Switcher Header */}
        <button
          type="button"
          onClick={() => setWorkspaceModalOpen(true)}
          className="flex w-full items-center justify-between gap-2.5 rounded-2xl border border-[#E5E2DA] bg-white px-3 py-2.5 text-left transition hover:border-[#D5D1C7]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1C1B19] text-xs font-bold tracking-wider text-white">
              AK
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[#1B1A18]">
                {store.profile.brandName}
              </div>
              <div className="truncate text-[11px] text-[#75726B]">{store.profile.tagline}</div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#75726B]" />
        </button>

        {/* Navigation Sections */}
        <nav aria-label="Main navigation" className="space-y-5">
          {primaryGroups.map((group) => (
            <div key={group.heading}>
              <div className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A877F]">
                {group.heading}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-medium transition ${
                          active
                            ? 'bg-white text-[#1B1A18] shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-[#E4E1D9]'
                            : 'text-[#5A5852] hover:bg-[#EAE8E1] hover:text-[#1B1A18]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active ? 'text-[#1B1A18]' : 'text-[#78756E] group-hover:text-[#1B1A18]'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.badge !== undefined && (
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              item.badgeTone === 'alert'
                                ? 'bg-[#FDE2DD] text-[#A8382B]'
                                : active
                                ? 'bg-[#F3F2EE] text-[#1B1A18]'
                                : 'bg-[#E7E5DD] text-[#5F5C55]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Brand Tip & Reset Trigger */}
      <div className="space-y-2 pt-4">
        <div className="rounded-2xl border border-[#E5E2DA] bg-[#FAF9F6] p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#1B1A18]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#C88A18]" />
              Founder Ops Ready
            </span>
            <span className="text-[10px] font-medium text-[#75726B]">
              {saving ? 'Saving…' : 'Saved'}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#6E6C66]">
            {pendingRemindersCount} follow-ups pending · {urgentReorderCount} reorder alerts.
          </p>
          <button
            type="button"
            onClick={() => setWorkspaceModalOpen(true)}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E2DFD7] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#3C3A36] transition hover:bg-[#F3F2EE]"
          >
            <RotateCcw className="h-3 w-3" />
            Workspace Settings
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F2EE] p-0 sm:p-3 lg:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1540px] overflow-hidden bg-[#F8F7F4] sm:rounded-[30px] sm:border sm:border-[#E4E1D9] sm:shadow-[0_12px_40px_rgba(24,22,18,0.04)]">
        {/* Desktop Sidebar */}
        <aside className="hidden w-[238px] shrink-0 border-r border-[#EAE7DF] bg-[#F3F2EE] lg:block">
          {sidebarContent}
        </aside>

        {/* Mobile Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/30"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative z-50 w-[260px] bg-[#F3F2EE] shadow-xl">
              <div className="flex items-center justify-end px-4 pt-3">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-full p-1.5 text-[#4C4A45] hover:bg-[#E7E5DD]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {sidebarContent}
            </aside>
          </div>
        )}

        {/* Main Workspace Area */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#F8F7F4]">
          {/* Top Navigation & Live Focus Bar (inspired by both sample UIs) */}
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2.5 border-b border-[#EAE7DF] bg-[#F8F7F4]/95 px-3.5 py-2.5 backdrop-blur-sm sm:px-6 sm:py-3">
            <div className="flex flex-1 items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E2DA] bg-white text-[#1B1A18] lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>

              {/* Search Input */}
              <div className="relative flex-1 min-w-0 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A877F]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SKUs, factories, tasks..."
                  aria-label="Search workspace"
                  className="h-9 sm:h-10 w-full rounded-full border border-[#E5E2DA] bg-white pl-9 pr-3 text-xs sm:text-[13px] text-[#1B1A18] placeholder:text-[#96938B] focus:border-[#1C1B19] focus:outline-none"
                />
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-12 z-30 rounded-2xl border border-[#E5E2DA] bg-white p-2 shadow-xl">
                    {searchResults.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          router.push(res.href);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-[#F3F2EE]"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-[#1B1A18]">
                            {res.title}
                          </div>
                          <div className="truncate text-[11px] text-[#75726B]">{res.subtitle}</div>
                        </div>
                        <span className="ml-2 shrink-0 rounded-full bg-[#F3F2EE] px-2 py-0.5 text-[10px] font-medium text-[#5A5852]">
                          {res.kind}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Focus Pill from Sample 1 */}
              <div className="hidden xl:flex items-center gap-3 rounded-full border border-[#E5E2DA] bg-white px-3.5 py-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[#5A5852]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Studio Live
                </span>
                <span className="h-3.5 w-px bg-[#E5E2DA]" />
                <span className="text-xs font-medium text-[#1B1A18]">
                  {formatDisplayDate(today, { weekday: false })}
                </span>
                <div className="flex -space-x-1">
                  {store.team.slice(0, 4).map((m) => (
                    <AvatarBadge key={m.id} member={m} size="xs" />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setQuickReminderOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E5E2DA] bg-white px-3.5 text-xs font-semibold text-[#1B1A18] transition hover:bg-[#F3F2EE]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Follow-up Reminder</span>
                <span className="sm:hidden">Remind</span>
              </button>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setBellOpen((o) => !o);
                    setMemberMenuOpen(false);
                  }}
                  aria-label="Follow-up reminders"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E2DA] bg-white text-[#1B1A18] transition hover:bg-[#F3F2EE]"
                >
                  <Bell className="h-4 w-4" />
                  {pendingReminders.length > 0 && (
                    <span
                      className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                        overdueRemindersCount > 0 ? 'bg-[#D94E3B]' : 'bg-[#1C1B19]'
                      }`}
                    >
                      {pendingReminders.length}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="fixed left-3 right-3 top-14 z-30 rounded-3xl border border-[#E5E2DA] bg-white p-4 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-96">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-[#1B1A18]">Follow-up Reminders</h2>
                        <p className="text-[11px] text-[#75726B]">
                          {overdueRemindersCount > 0
                            ? `${overdueRemindersCount} due today or overdue`
                            : `${pendingReminders.length} scheduled`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBellOpen(false);
                          setQuickReminderOpen(true);
                        }}
                        className="rounded-full bg-[#1C1B19] px-2.5 py-1 text-[11px] font-semibold text-white"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {pendingReminders.length === 0 ? (
                        <p className="py-6 text-center text-xs text-[#8A877F]">
                          All caught up! No pending follow-ups.
                        </p>
                      ) : (
                        pendingReminders.map((rem) => {
                          const rel = formatRelativeDate(rem.dueDate, today);
                          return (
                            <div
                              key={rem.id}
                              className="rounded-2xl border border-[#EDEAE2] bg-[#FAF9F6] p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-[#1B1A18]">
                                    {rem.title}
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-[#6E6C66]">
                                    {rem.askStatusPrompt}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    rel.tone === 'overdue'
                                      ? 'bg-[#FDE2DD] text-[#A8382B]'
                                      : rel.tone === 'today'
                                      ? 'bg-[#FCF0C2] text-[#845E07]'
                                      : 'bg-[#ECECE8] text-[#4E4D47]'
                                  }`}
                                >
                                  {rel.label}
                                </span>
                              </div>
                              <div className="mt-2.5 flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1 text-[11px] text-[#75726B]">
                                  <Clock className="h-3 w-3" /> {rem.dueTime}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateStore(
                                        (prev) => ({
                                          ...prev,
                                          reminders: prev.reminders.map((r) =>
                                            r.id === rem.id
                                              ? { ...r, dueDate: addDaysIso(r.dueDate, 2) }
                                              : r
                                          ),
                                        }),
                                        'Snoozed reminder +2 days'
                                      )
                                    }
                                    className="rounded-lg border border-[#E2DFD7] bg-white px-2 py-1 text-[10px] font-medium text-[#4C4A45] hover:bg-[#F3F2EE]"
                                  >
                                    +2d
                                  </button>
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
                                        'Follow-up completed'
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-[#1C1B19] px-2 py-1 text-[10px] font-semibold text-white"
                                  >
                                    <Check className="h-3 w-3" /> Done
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Team Member Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMemberMenuOpen((o) => !o);
                    setBellOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-full border border-[#E5E2DA] bg-white py-1 pl-1.5 pr-3 transition hover:bg-[#F3F2EE]"
                >
                  <AvatarBadge member={activeMember} size="sm" showStatus />
                  <span className="hidden text-left sm:block">
                    <span className="block text-xs font-semibold leading-tight text-[#1B1A18]">
                      {activeMember?.name || 'Founder'}
                    </span>
                    <span className="block text-[10px] leading-tight text-[#75726B]">
                      {activeMember?.role || 'Team'}
                    </span>
                  </span>
                </button>
                {memberMenuOpen && (
                  <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-[#E5E2DA] bg-white p-2 shadow-xl">
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8A877F]">
                      Acting as Team Member
                    </div>
                    {store.team.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          updateStore(
                            (prev) => ({
                              ...prev,
                              profile: { ...prev.profile, activeMemberId: m.id },
                            }),
                            `Switched active member to ${m.name}`
                          );
                          setMemberMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition ${
                          m.id === activeMember?.id ? 'bg-[#F3F2EE]' : 'hover:bg-[#FAF9F6]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <AvatarBadge member={m} size="sm" showStatus />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-[#1B1A18]">
                              {m.name}
                            </div>
                            <div className="truncate text-[10px] text-[#75726B]">{m.role}</div>
                          </div>
                        </div>
                        {m.id === activeMember?.id && <Check className="h-3.5 w-3.5 text-[#1B1A18]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-3.5 pb-24 sm:p-6 lg:pb-6">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[#E4E1D9] bg-white/95 px-1 py-1.5 backdrop-blur-md lg:hidden"
      >
        {[
          { href: '/', label: 'Home', icon: Home },
          { href: '/collections', label: 'SKUs', icon: Layers },
          { href: '/manufacturers', label: 'Factories', icon: Factory },
          { href: '/inventory', label: 'Inventory', icon: Boxes },
          { href: '/calendar', label: 'Calendar', icon: CalendarDays },
        ].map((item) => {
          const Icon = item.icon;
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-semibold transition ${
                active ? 'text-[#1B1A18]' : 'text-[#78756E]'
              }`}
            >
              <span
                className={`flex h-7 w-10 items-center justify-center rounded-full ${
                  active ? 'bg-[#1C1B19] text-white' : ''
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Reminder Modal */}
      <ModalDialog
        open={quickReminderOpen}
        onClose={() => setQuickReminderOpen(false)}
        title="Schedule Follow-up Reminder"
        subtitle="Set a reminder to follow up and ask for production, sample, or quote status."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSaveQuickReminder} className="space-y-4">
          <div>
            <label htmlFor="q-rem-title" className="block text-xs font-semibold text-[#3C3A36]">
              Reminder title *
            </label>
            <input
              id="q-rem-title"
              required
              value={remTitle}
              onChange={(e) => setRemTitle(e.target.value)}
              placeholder="e.g., Follow up with Porto Fleece on hoodie sample"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3.5 text-sm focus:border-[#1C1B19] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="q-rem-type" className="block text-xs font-semibold text-[#3C3A36]">
                Related to
              </label>
              <select
                id="q-rem-type"
                value={remTargetType}
                onChange={(e) => {
                  setRemTargetType(e.target.value as typeof remTargetType);
                  setRemTargetId('');
                }}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm focus:border-[#1C1B19] focus:outline-none"
              >
                <option value="manufacturer">Manufacturer</option>
                <option value="supplier">Supplier</option>
                <option value="sku">Product / SKU</option>
                <option value="general">General Brand Note</option>
              </select>
            </div>

            {remTargetType !== 'general' && (
              <div>
                <label htmlFor="q-rem-target" className="block text-xs font-semibold text-[#3C3A36]">
                  Select {remTargetType}
                </label>
                <select
                  id="q-rem-target"
                  value={remTargetId}
                  onChange={(e) => setRemTargetId(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm focus:border-[#1C1B19] focus:outline-none"
                >
                  <option value="">Optional — choose item</option>
                  {(remTargetType === 'manufacturer' || remTargetType === 'supplier') &&
                    store.vendors
                      .filter((v) => v.kind === remTargetType)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.companyName} ({v.contactName})
                        </option>
                      ))}
                  {remTargetType === 'sku' &&
                    store.skus.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.skuCode} · {s.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="q-rem-date" className="block text-xs font-semibold text-[#3C3A36]">
                Follow-up date
              </label>
              <input
                id="q-rem-date"
                type="date"
                value={remDate}
                onChange={(e) => setRemDate(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="q-rem-time" className="block text-xs font-semibold text-[#3C3A36]">
                Time
              </label>
              <input
                id="q-rem-time"
                type="time"
                value={remTime}
                onChange={(e) => setRemTime(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="q-rem-pri" className="block text-xs font-semibold text-[#3C3A36]">
                Priority
              </label>
              <select
                id="q-rem-pri"
                value={remPriority}
                onChange={(e) => setRemPriority(e.target.value as typeof remPriority)}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="q-rem-prompt" className="block text-xs font-semibold text-[#3C3A36]">
              What to ask / check when following up
            </label>
            <textarea
              id="q-rem-prompt"
              rows={3}
              value={remPrompt}
              onChange={(e) => setRemPrompt(e.target.value)}
              placeholder="e.g., Ask for DHL tracking number and confirm fabric GSM shrinkage test results."
              className="mt-1.5 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] p-3 text-sm focus:border-[#1C1B19] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setQuickReminderOpen(false)}
              className="rounded-full border border-[#DFDCD3] px-4 py-2 text-xs font-semibold text-[#4C4A45] hover:bg-[#F3F2EE]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#1C1B19] px-5 py-2 text-xs font-semibold text-white hover:bg-[#33312D]"
            >
              Save Reminder
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Workspace Settings & Blank/Demo Reset Modal */}
      <ModalDialog
        open={workspaceModalOpen}
        onClose={() => setWorkspaceModalOpen(false)}
        title="Brand Workspace Settings"
        subtitle="Customize your brand identity or reset between sample data and a blank workspace."
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <div>
              <label htmlFor="ws-name" className="block text-xs font-semibold text-[#3C3A36]">
                Clothing Brand Name
              </label>
              <input
                id="ws-name"
                value={store.profile.brandName}
                onChange={(e) =>
                  updateStore((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, brandName: e.target.value },
                  }))
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="ws-tag" className="block text-xs font-semibold text-[#3C3A36]">
                Studio Tagline / Current Drop
              </label>
              <input
                id="ws-tag"
                value={store.profile.tagline}
                onChange={(e) =>
                  updateStore((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, tagline: e.target.value },
                  }))
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#EDEAE2] bg-[#FAF9F6] p-4">
            <h3 className="text-xs font-semibold text-[#1B1A18]">Workspace Data Mode</h3>
            <p className="mt-1 text-xs text-[#6E6C66]">
              Start completely blank for your own clothing brand, or restore the Akoya Atelier demo dataset anytime.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await resetWorkspace('blank');
                  setWorkspaceModalOpen(false);
                }}
                className="rounded-full border border-[#DFDCD3] bg-white px-4 py-2 text-xs font-semibold text-[#1B1A18] hover:bg-[#F3F2EE]"
              >
                Start Fresh (Empty Workspace)
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resetWorkspace('demo');
                  setWorkspaceModalOpen(false);
                }}
                className="rounded-full bg-[#1C1B19] px-4 py-2 text-xs font-semibold text-white hover:bg-[#33312D]"
              >
                Restore Demo Brand Data
              </button>
            </div>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
