'use client';

import React, { useMemo, useState } from 'react';
import {
  BellPlus,
  CalendarClock,
  Globe,
  LayoutGrid,
  Mail,
  MapPin,
  MessageSquarePlus,
  Phone,
  Plus,
  SlidersHorizontal,
  Star,
  Table2,
  Trash2,
} from 'lucide-react';
import { useAkoya } from '@/context/AkoyaContext';
import {
  ConversationChannel,
  PastelTheme,
  StageConfig,
  Vendor,
  VendorKind,
} from '@/types/akoya';
import { PASTEL_THEMES, uid } from '@/lib/themes';
import { addDaysIso, formatDisplayDate, formatRelativeDate } from '@/lib/dateUtils';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { AvatarBadge } from '@/components/ui/AvatarBadge';

const MANUFACTURER_CATEGORIES = [
  'Cut & Sew',
  'Heavyweight Knit',
  'Denim & Trousers',
  'Outerwear',
  'Activewear',
  'Full Package',
  'Knitwear & Sweaters',
];

const SUPPLIER_CATEGORIES = [
  'Fabric',
  'Patches',
  'Embroidery',
  'Labels & Tags',
  'Hardware & Zippers',
  'Packaging',
  'Dye & Wash',
];

export function VendorWorkspace({ kind }: { kind: VendorKind }) {
  const { store, today, updateStore } = useAkoya();

  const isMfg = kind === 'manufacturer';
  const title = isMfg ? 'Manufacturers & Factories' : 'Material & Trim Suppliers';
  const subtitle = isMfg
    ? 'Track factory outreach, last conversations, sample progress, custom pipeline stages, MOQs, and follow-up dates.'
    : 'Manage fabric mills, patch makers, embroidery houses, woven labels, hardware, and packaging suppliers.';

  const stages = useMemo(
    () => store.stages.filter((s) => s.kind === kind),
    [store.stages, kind]
  );

  const vendors = useMemo(
    () => store.vendors.filter((v) => v.kind === kind),
    [store.vendors, kind]
  );

  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(
    vendors[0]?.id || null
  );

  // Modals
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [stagesModalOpen, setStagesModalOpen] = useState(false);
  const [reminderVendor, setReminderVendor] = useState<Vendor | null>(null);

  // New custom stage state
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newStageTheme, setNewStageTheme] = useState<PastelTheme>('peach');

  // Log conversation state
  const [logChannel, setLogChannel] = useState<ConversationChannel>('WhatsApp');
  const [logDate, setLogDate] = useState(today);
  const [logSummary, setLogSummary] = useState('');

  // Follow-up reminder state
  const [remDate, setRemDate] = useState(addDaysIso(today, 3));
  const [remTime, setRemTime] = useState('10:30');
  const [remPrompt, setRemPrompt] = useState('');

  // Vendor form state
  const [formState, setFormState] = useState({
    companyName: '',
    contactName: '',
    role: '',
    email: '',
    phone: '',
    messagingHandle: '',
    location: '',
    country: '',
    website: '',
    category: isMfg ? MANUFACTURER_CATEGORIES[0] : SUPPLIER_CATEGORIES[0],
    specialtyTags: '',
    stageId: stages[0]?.id || '',
    moq: 100,
    moqUnit: isMfg ? 'pcs' : 'meters',
    pricingSummary: '',
    sampleCost: '',
    leadTimeDays: 30,
    lastContactDate: today,
    lastConversation: '',
    nextReachOutDate: addDaysIso(today, 4),
    rating: 4,
    notes: '',
  });

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (stageFilter !== 'all' && v.stageId !== stageFilter) return false;
      if (categoryFilter !== 'all' && v.category !== categoryFilter) return false;
      return true;
    });
  }, [vendors, stageFilter, categoryFilter]);

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === selectedVendorId) || filteredVendors[0] || null,
    [vendors, selectedVendorId, filteredVendors]
  );

  const openAddVendor = () => {
    setEditingVendorId(null);
    setFormState({
      companyName: '',
      contactName: '',
      role: '',
      email: '',
      phone: '',
      messagingHandle: '',
      location: '',
      country: '',
      website: '',
      category: isMfg ? MANUFACTURER_CATEGORIES[0] : SUPPLIER_CATEGORIES[0],
      specialtyTags: '',
      stageId: stages[0]?.id || '',
      moq: isMfg ? 100 : 200,
      moqUnit: isMfg ? 'pcs' : 'meters',
      pricingSummary: '',
      sampleCost: '',
      leadTimeDays: isMfg ? 35 : 14,
      lastContactDate: today,
      lastConversation: '',
      nextReachOutDate: addDaysIso(today, 4),
      rating: 4,
      notes: '',
    });
    setVendorModalOpen(true);
  };

  const openEditVendor = (v: Vendor) => {
    setEditingVendorId(v.id);
    setFormState({
      companyName: v.companyName,
      contactName: v.contactName,
      role: v.role,
      email: v.email,
      phone: v.phone,
      messagingHandle: v.messagingHandle,
      location: v.location,
      country: v.country,
      website: v.website || '',
      category: v.category,
      specialtyTags: v.specialtyTags.join(', '),
      stageId: v.stageId,
      moq: v.moq,
      moqUnit: v.moqUnit,
      pricingSummary: v.pricingSummary,
      sampleCost: v.sampleCost,
      leadTimeDays: v.leadTimeDays,
      lastContactDate: v.lastContactDate,
      lastConversation: v.lastConversation,
      nextReachOutDate: v.nextReachOutDate,
      rating: v.rating,
      notes: v.notes,
    });
    setVendorModalOpen(true);
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.companyName.trim()) return;

    const tags = formState.specialtyTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingVendorId) {
      updateStore(
        (prev) => ({
          ...prev,
          vendors: prev.vendors.map((v) =>
            v.id === editingVendorId
              ? {
                  ...v,
                  ...formState,
                  specialtyTags: tags,
                }
              : v
          ),
        }),
        `${formState.companyName} updated`
      );
    } else {
      const newId = uid('ven');
      const newVendor: Vendor = {
        id: newId,
        kind,
        ...formState,
        specialtyTags: tags,
        conversationLog: formState.lastConversation.trim()
          ? [
              {
                id: uid('cl'),
                date: formState.lastContactDate,
                channel: 'Email',
                summary: formState.lastConversation.trim(),
                authorId: store.profile.activeMemberId,
              },
            ]
          : [],
      };
      updateStore(
        (prev) => ({
          ...prev,
          vendors: [newVendor, ...prev.vendors],
        }),
        `Added ${formState.companyName}`
      );
      setSelectedVendorId(newId);
    }
    setVendorModalOpen(false);
  };

  const handleDeleteVendor = (v: Vendor) => {
    updateStore(
      (prev) => ({
        ...prev,
        vendors: prev.vendors.filter((item) => item.id !== v.id),
        reminders: prev.reminders.filter((r) => r.targetId !== v.id),
      }),
      `Removed ${v.companyName}`
    );
    if (selectedVendorId === v.id) setSelectedVendorId(null);
  };

  const handleLogConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !logSummary.trim()) return;
    const entry = {
      id: uid('cl'),
      date: logDate,
      time: new Date().toTimeString().slice(0, 5),
      channel: logChannel,
      summary: logSummary.trim(),
      authorId: store.profile.activeMemberId,
    };
    updateStore(
      (prev) => ({
        ...prev,
        vendors: prev.vendors.map((v) =>
          v.id === selectedVendor.id
            ? {
                ...v,
                lastContactDate: logDate,
                lastConversation: logSummary.trim(),
                conversationLog: [entry, ...v.conversationLog],
              }
            : v
        ),
      }),
      'Conversation logged'
    );
    setLogSummary('');
  };

  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageLabel.trim()) return;
    const stage: StageConfig = {
      id: uid(isMfg ? 'mfg' : 'sup'),
      kind,
      label: newStageLabel.trim(),
      theme: newStageTheme,
      isDefault: false,
    };
    updateStore(
      (prev) => ({
        ...prev,
        stages: [...prev.stages, stage],
      }),
      `Stage "${stage.label}" created`
    );
    setNewStageLabel('');
  };

  const handleDeleteStage = (stageId: string) => {
    const fallbackId = stages.find((s) => s.id !== stageId)?.id || '';
    updateStore(
      (prev) => ({
        ...prev,
        stages: prev.stages.filter((s) => s.id !== stageId),
        vendors: prev.vendors.map((v) =>
          v.stageId === stageId ? { ...v, stageId: fallbackId } : v
        ),
      }),
      'Custom stage removed'
    );
  };

  const handleCreateVendorReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderVendor) return;
    updateStore(
      (prev) => ({
        ...prev,
        reminders: [
          {
            id: uid('rem'),
            title: `Follow up with ${reminderVendor.companyName} (${reminderVendor.contactName})`,
            askStatusPrompt:
              remPrompt.trim() || 'Ask for current sample/production status and updated lead time.',
            dueDate: remDate,
            dueTime: remTime,
            targetType: kind,
            targetId: reminderVendor.id,
            assigneeId: prev.profile.activeMemberId,
            status: 'pending',
            priority: 'high',
          },
          ...prev.reminders,
        ],
        vendors: prev.vendors.map((v) =>
          v.id === reminderVendor.id ? { ...v, nextReachOutDate: remDate } : v
        ),
      }),
      `Follow-up reminder set for ${formatDisplayDate(remDate)}`
    );
    setReminderVendor(null);
    setRemPrompt('');
  };

  const getStage = (stageId: string) =>
    stages.find((s) => s.id === stageId) || stages[0];

  const categoryOptions = isMfg ? MANUFACTURER_CATEGORIES : SUPPLIER_CATEGORIES;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1A18]">{title}</h1>
          <p className="mt-0.5 text-sm text-[#6E6C66]">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStagesModalOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#DFDCD3] bg-white px-4 text-xs font-semibold text-[#1B1A18] transition hover:bg-[#F3F2EE]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Custom Stages ({stages.length})
          </button>

          <div className="inline-flex rounded-full border border-[#DFDCD3] bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                viewMode === 'table' ? 'bg-[#1C1B19] text-white' : 'text-[#5A5852]'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                viewMode === 'pipeline' ? 'bg-[#1C1B19] text-white' : 'text-[#5A5852]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Stages
            </button>
          </div>

          <button
            type="button"
            onClick={openAddVendor}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1C1B19] px-5 text-xs font-semibold text-white transition hover:bg-[#32302C]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add {isMfg ? 'Manufacturer' : 'Supplier'}
          </button>
        </div>
      </div>

      {/* Stage Filter Pills + Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStageFilter('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              stageFilter === 'all'
                ? 'bg-[#1C1B19] text-white'
                : 'border border-[#E5E2DA] bg-white text-[#5A5852] hover:bg-[#F3F2EE]'
            }`}
          >
            All ({vendors.length})
          </button>
          {stages.map((st) => {
            const count = vendors.filter((v) => v.stageId === st.id).length;
            const t = PASTEL_THEMES[st.theme] || PASTEL_THEMES.slate;
            const active = stageFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStageFilter(active ? 'all' : st.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-[#1C1B19] text-white'
                    : `${t.pillBg} ${t.pillText} hover:brightness-95`
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white' : t.dot}`} />
                {st.label} ({count})
              </button>
            );
          })}
        </div>

        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-full border border-[#E5E2DA] bg-white px-3.5 text-xs font-medium text-[#1B1A18]"
        >
          <option value="all">All Categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content + Right Detail Drawer */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left List / Pipeline */}
        <div className={selectedVendor ? 'xl:col-span-7' : 'xl:col-span-12'}>
          {filteredVendors.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#D5D1C7] bg-white p-12 text-center">
              <h2 className="text-base font-semibold text-[#1B1A18]">
                No {isMfg ? 'manufacturers' : 'suppliers'} match this filter
              </h2>
              <p className="mt-1 text-xs text-[#75726B]">
                Add your first {isMfg ? 'factory contact' : 'fabric or trim supplier'} to track conversations, pricing, and follow-up dates.
              </p>
              <button
                type="button"
                onClick={openAddVendor}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1C1B19] px-4 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add {isMfg ? 'Manufacturer' : 'Supplier'}
              </button>
            </div>
          ) : viewMode === 'table' ? (
            <>
              {/* Mobile Card List */}
              <div className="space-y-2.5 md:hidden">
                {filteredVendors.map((v) => {
                  const st = getStage(v.stageId);
                  const t = st ? PASTEL_THEMES[st.theme] : PASTEL_THEMES.slate;
                  const relNext = formatRelativeDate(v.nextReachOutDate, today);
                  const selected = selectedVendor?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVendorId(v.id)}
                      className={`w-full rounded-[22px] border bg-white p-4 text-left transition ${
                        selected ? 'border-[#1C1B19] ring-1 ring-[#1C1B19]' : 'border-[#E6E3DA]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-[#1B1A18]">
                            {v.companyName}
                          </div>
                          <div className="mt-0.5 text-xs text-[#6E6C66]">
                            {v.contactName} · {v.location}, {v.country}
                          </div>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${t.pillBg} ${t.pillText}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                          {st?.label || 'Unassigned'}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-[#4C4A45]">
                        {v.lastConversation || 'No conversation logged yet.'}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F2EFE8] pt-2.5 text-[11px]">
                        <span className="font-medium text-[#1B1A18]">
                          {v.pricingSummary || `MOQ ${v.moq} ${v.moqUnit}`}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            relNext.tone === 'overdue'
                              ? 'bg-[#FDE2DD] text-[#A8382B]'
                              : relNext.tone === 'today'
                              ? 'bg-[#FCF0C2] text-[#845E07]'
                              : 'bg-[#F3F2EE] text-[#4E4D47]'
                          }`}
                        >
                          Next: {relNext.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden overflow-hidden rounded-[28px] border border-[#E6E3DA] bg-white md:block">
                <div
                  tabIndex={0}
                  role="region"
                  aria-label={`${title} directory`}
                  className="akoya-table-wrapper max-h-[680px]"
                >
                  <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10 border-b border-[#EFECE6] bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-wider text-[#75726B]">
                    <tr>
                      <th className="px-4 py-3.5">Partner & Location</th>
                      <th className="px-3 py-3.5">Stage</th>
                      <th className="px-3 py-3.5">Pricing & MOQ</th>
                      <th className="px-3 py-3.5">Last Contact</th>
                      <th className="px-4 py-3.5">Next Reach-Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EFE8] text-xs">
                    {filteredVendors.map((v) => {
                      const st = getStage(v.stageId);
                      const t = st ? PASTEL_THEMES[st.theme] : PASTEL_THEMES.slate;
                      const relNext = formatRelativeDate(v.nextReachOutDate, today);
                      const selected = selectedVendor?.id === v.id;

                      return (
                        <tr
                          key={v.id}
                          onClick={() => setSelectedVendorId(v.id)}
                          className={`cursor-pointer transition ${
                            selected ? 'bg-[#FBF7E8]' : 'hover:bg-[#FAF9F6]'
                          }`}
                        >
                          <th className="px-4 py-3.5 font-normal">
                            <div className="font-semibold text-[#1B1A18]">{v.companyName}</div>
                            <div className="mt-0.5 text-[11px] text-[#6E6C66]">
                              {v.contactName} · {v.location}, {v.country}
                            </div>
                            <span className="mt-1 inline-block rounded-md bg-[#F3F2EE] px-1.5 py-0.5 text-[10px] font-medium text-[#5A5852]">
                              {v.category}
                            </span>
                          </th>
                          <td className="px-3 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${t.pillBg} ${t.pillText}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                              {st?.label || 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="font-medium text-[#1B1A18]">
                              {v.pricingSummary || 'TBD'}
                            </div>
                            <div className="text-[11px] text-[#75726B]">
                              MOQ {v.moq} {v.moqUnit} · {v.leadTimeDays}d lead
                            </div>
                          </td>
                          <td className="px-3 py-3.5">
                            <div className="font-medium text-[#1B1A18]">
                              {formatDisplayDate(v.lastContactDate)}
                            </div>
                            <div className="max-w-[190px] truncate text-[11px] text-[#75726B]">
                              {v.lastConversation || 'No notes yet'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
                                relNext.tone === 'overdue'
                                  ? 'bg-[#FDE2DD] text-[#A8382B]'
                                  : relNext.tone === 'today'
                                  ? 'bg-[#FCF0C2] text-[#845E07]'
                                  : 'bg-[#F3F2EE] text-[#4E4D47]'
                              }`}
                            >
                              {relNext.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          ) : (
            /* Pipeline View grouped by Custom Stages */
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {stages.map((st) => {
                const t = PASTEL_THEMES[st.theme] || PASTEL_THEMES.slate;
                const stageVendors = filteredVendors.filter((v) => v.stageId === st.id);
                return (
                  <div
                    key={st.id}
                    className={`rounded-[24px] border p-4 ${t.cardBg} ${t.cardBorder}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                        <h3 className="text-xs font-bold text-[#1B1A18]">{st.label}</h3>
                      </div>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-[#1B1A18]">
                        {stageVendors.length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {stageVendors.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-black/15 bg-white/40 p-4 text-center text-[11px] text-[#6E6C66]">
                          No partners in this stage
                        </div>
                      ) : (
                        stageVendors.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVendorId(v.id)}
                            className={`w-full rounded-2xl border bg-white p-3.5 text-left transition ${
                              selectedVendor?.id === v.id
                                ? 'border-[#1C1B19] ring-1 ring-[#1C1B19]'
                                : 'border-white hover:border-[#D5D1C7]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-semibold text-xs text-[#1B1A18]">
                                {v.companyName}
                              </div>
                              <span className="text-[10px] text-[#75726B]">{v.country}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-[#6E6C66]">
                              {v.contactName} · {v.pricingSummary || 'Quote pending'}
                            </div>
                            <p className="mt-2 line-clamp-2 text-[11px] text-[#4C4A45]">
                              {v.lastConversation || 'No conversation logged yet.'}
                            </p>
                            <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#75726B]">
                              <span>Last: {formatDisplayDate(v.lastContactDate)}</span>
                              <span className="font-semibold text-[#1B1A18]">
                                Next: {formatRelativeDate(v.nextReachOutDate, today).label}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Detail Inspector Drawer */}
        {selectedVendor && (
          <aside className="rounded-[28px] border border-[#E6E3DA] bg-white p-5 xl:col-span-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#EFECE6] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#F3F2EE] px-2.5 py-0.5 text-[10px] font-semibold text-[#5A5852]">
                    {selectedVendor.category}
                  </span>
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-[#D69E14]">
                    <Star className="h-3.5 w-3.5 fill-current" /> {selectedVendor.rating}/5
                  </span>
                </div>
                <h2 className="mt-1.5 text-xl font-bold text-[#1B1A18]">
                  {selectedVendor.companyName}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#6E6C66]">
                  <MapPin className="h-3.5 w-3.5" />
                  {selectedVendor.location}, {selectedVendor.country}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditVendor(selectedVendor)}
                  className="rounded-full border border-[#DFDCD3] px-3 py-1.5 text-xs font-semibold text-[#1B1A18] hover:bg-[#F3F2EE]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteVendor(selectedVendor)}
                  aria-label="Delete partner"
                  className="rounded-full border border-[#F0D5D1] p-1.5 text-[#A8382B] hover:bg-[#FDF1EE]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Stage + Follow-up Reminder Controls */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="detail-stage-select"
                  className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A877F]"
                >
                  Current Pipeline Stage
                </label>
                <select
                  id="detail-stage-select"
                  value={selectedVendor.stageId}
                  onChange={(e) => {
                    const nextStage = e.target.value;
                    updateStore(
                      (prev) => ({
                        ...prev,
                        vendors: prev.vendors.map((v) =>
                          v.id === selectedVendor.id ? { ...v, stageId: nextStage } : v
                        ),
                      }),
                      'Stage updated'
                    );
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-xs font-semibold text-[#1B1A18]"
                >
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="detail-next-date"
                  className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A877F]"
                >
                  Next Reach-Out Date
                </label>
                <div className="mt-1 flex gap-1.5">
                  <input
                    id="detail-next-date"
                    type="date"
                    value={selectedVendor.nextReachOutDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateStore(
                        (prev) => ({
                          ...prev,
                          vendors: prev.vendors.map((v) =>
                            v.id === selectedVendor.id ? { ...v, nextReachOutDate: val } : v
                          ),
                        }),
                        'Next reach-out date updated'
                      );
                    }}
                    className="h-10 flex-1 rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-2.5 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReminderVendor(selectedVendor);
                      setRemDate(selectedVendor.nextReachOutDate || addDaysIso(today, 2));
                      setRemPrompt(
                        `Follow up with ${selectedVendor.contactName} at ${selectedVendor.companyName} for status update.`
                      );
                    }}
                    title="Set follow-up reminder"
                    className="inline-flex h-10 items-center gap-1 rounded-xl bg-[#F7D147] px-3 text-xs font-bold text-[#1B1A18] hover:brightness-95"
                  >
                    <BellPlus className="h-3.5 w-3.5" /> Remind
                  </button>
                </div>
              </div>
            </div>

            {/* Contact Card & Commercial Terms */}
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-[#EFECE6] bg-[#FAF9F6] p-4 sm:grid-cols-2">
              <div className="space-y-1.5 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A877F]">
                  Contact Details
                </div>
                <div className="font-semibold text-[#1B1A18]">
                  {selectedVendor.contactName}{' '}
                  <span className="font-normal text-[#6E6C66]">({selectedVendor.role || 'Rep'})</span>
                </div>
                {selectedVendor.email && (
                  <a
                    href={`mailto:${selectedVendor.email}`}
                    className="flex items-center gap-1.5 text-[#4C4A45] hover:text-[#1B1A18]"
                  >
                    <Mail className="h-3.5 w-3.5 text-[#75726B]" />
                    <span className="truncate">{selectedVendor.email}</span>
                  </a>
                )}
                {selectedVendor.phone && (
                  <div className="flex items-center gap-1.5 text-[#4C4A45]">
                    <Phone className="h-3.5 w-3.5 text-[#75726B]" />
                    <span>{selectedVendor.phone}</span>
                  </div>
                )}
                {selectedVendor.messagingHandle && (
                  <div className="text-[11px] font-medium text-[#2B8A57]">
                    {selectedVendor.messagingHandle}
                  </div>
                )}
                {selectedVendor.website && (
                  <a
                    href={selectedVendor.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-[#5A5852] underline"
                  >
                    <Globe className="h-3 w-3" /> Website
                  </a>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A877F]">
                  Pricing & Terms
                </div>
                <div>
                  <span className="text-[#75726B]">Pricing: </span>
                  <span className="font-semibold text-[#1B1A18]">
                    {selectedVendor.pricingSummary || 'Not quoted'}
                  </span>
                </div>
                <div>
                  <span className="text-[#75726B]">MOQ: </span>
                  <span className="font-semibold text-[#1B1A18]">
                    {selectedVendor.moq} {selectedVendor.moqUnit}
                  </span>
                </div>
                <div>
                  <span className="text-[#75726B]">Sample Cost: </span>
                  <span className="font-medium text-[#1B1A18]">
                    {selectedVendor.sampleCost || 'TBD'}
                  </span>
                </div>
                <div>
                  <span className="text-[#75726B]">Lead Time: </span>
                  <span className="font-medium text-[#1B1A18]">
                    {selectedVendor.leadTimeDays} days
                  </span>
                </div>
              </div>
            </div>

            {/* Specialties & Notes */}
            {(selectedVendor.specialtyTags.length > 0 || selectedVendor.notes) && (
              <div className="mt-3 space-y-2">
                {selectedVendor.specialtyTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVendor.specialtyTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#F3F2EE] px-2.5 py-0.5 text-[11px] font-medium text-[#4C4A45]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {selectedVendor.notes && (
                  <p className="rounded-xl bg-[#FAF9F6] px-3 py-2 text-xs text-[#5A5852]">
                    {selectedVendor.notes}
                  </p>
                )}
              </div>
            )}

            {/* Log New Conversation */}
            <form
              onSubmit={handleLogConversation}
              className="mt-4 rounded-2xl border border-[#EAE7DF] bg-[#FAF9F6] p-3.5"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#1B1A18]">
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Log Conversation
                </span>
                <span className="text-[11px] text-[#75726B]">
                  Last: {formatDisplayDate(selectedVendor.lastContactDate)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  aria-label="Conversation channel"
                  value={logChannel}
                  onChange={(e) => setLogChannel(e.target.value as ConversationChannel)}
                  className="h-9 rounded-xl border border-[#DFDCD3] bg-white px-2.5 text-xs"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="WeChat">WeChat</option>
                  <option value="Call">Phone Call</option>
                  <option value="Factory Visit">Factory Visit</option>
                </select>
                <input
                  type="date"
                  aria-label="Conversation date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="h-9 rounded-xl border border-[#DFDCD3] bg-white px-2.5 text-xs"
                />
              </div>
              <textarea
                rows={2}
                value={logSummary}
                onChange={(e) => setLogSummary(e.target.value)}
                placeholder="What did you discuss? (e.g. Confirmed 460gsm sample shipment, quoted $24/pc)"
                className="mt-2 w-full rounded-xl border border-[#DFDCD3] bg-white p-2.5 text-xs focus:border-[#1C1B19] focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  className="rounded-full bg-[#1C1B19] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#32302C]"
                >
                  Save Conversation
                </button>
              </div>
            </form>

            {/* Conversation History */}
            <div className="mt-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A877F]">
                Conversation History ({selectedVendor.conversationLog.length})
              </div>
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {selectedVendor.conversationLog.length === 0 ? (
                  <p className="text-xs text-[#8A877F]">No conversations logged yet.</p>
                ) : (
                  selectedVendor.conversationLog.map((entry) => {
                    const author = store.team.find((m) => m.id === entry.authorId);
                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-[#F0EDE6] bg-[#FAF9F6] p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <AvatarBadge member={author} size="xs" />
                            <span className="font-semibold text-[#1B1A18]">{entry.channel}</span>
                          </div>
                          <span className="text-[10px] text-[#75726B]">
                            {formatDisplayDate(entry.date)}
                          </span>
                        </div>
                        <p className="mt-1.5 leading-relaxed text-[#4C4A45]">{entry.summary}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Add / Edit Vendor Modal */}
      <ModalDialog
        open={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        title={
          editingVendorId
            ? `Edit ${isMfg ? 'Manufacturer' : 'Supplier'}`
            : `Add New ${isMfg ? 'Manufacturer' : 'Supplier'}`
        }
        subtitle="Keep track of contacts, location, MOQ, pricing, stage, and next follow-up date."
      >
        <form onSubmit={handleSaveVendor} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="v-company" className="block text-xs font-semibold text-[#3C3A36]">
                Company / Factory Name *
              </label>
              <input
                id="v-company"
                required
                value={formState.companyName}
                onChange={(e) => setFormState({ ...formState, companyName: e.target.value })}
                placeholder={isMfg ? 'e.g. Porto Fleece & Cut Co.' : 'e.g. Kobe Crest Embroidery'}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="v-contact" className="block text-xs font-semibold text-[#3C3A36]">
                Contact Person *
              </label>
              <input
                id="v-contact"
                required
                value={formState.contactName}
                onChange={(e) => setFormState({ ...formState, contactName: e.target.value })}
                placeholder="e.g. Tiago Almeida"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="v-email" className="block text-xs font-semibold text-[#3C3A36]">
                Email
              </label>
              <input
                id="v-email"
                type="email"
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="v-phone" className="block text-xs font-semibold text-[#3C3A36]">
                Phone
              </label>
              <input
                id="v-phone"
                value={formState.phone}
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="v-handle" className="block text-xs font-semibold text-[#3C3A36]">
                WhatsApp / WeChat
              </label>
              <input
                id="v-handle"
                value={formState.messagingHandle}
                onChange={(e) => setFormState({ ...formState, messagingHandle: e.target.value })}
                placeholder="WhatsApp +351..."
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="v-city" className="block text-xs font-semibold text-[#3C3A36]">
                City / Region
              </label>
              <input
                id="v-city"
                value={formState.location}
                onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                placeholder="e.g. Barcelos"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="v-country" className="block text-xs font-semibold text-[#3C3A36]">
                Country
              </label>
              <input
                id="v-country"
                value={formState.country}
                onChange={(e) => setFormState({ ...formState, country: e.target.value })}
                placeholder="e.g. Portugal"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="v-cat" className="block text-xs font-semibold text-[#3C3A36]">
                Category
              </label>
              <select
                id="v-cat"
                value={formState.category}
                onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="v-stage" className="block text-xs font-semibold text-[#3C3A36]">
                Stage / Status
              </label>
              <select
                id="v-stage"
                value={formState.stageId}
                onChange={(e) => setFormState({ ...formState, stageId: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-2.5 text-sm"
              >
                {stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="v-moq" className="block text-xs font-semibold text-[#3C3A36]">
                MOQ
              </label>
              <input
                id="v-moq"
                type="number"
                value={formState.moq}
                onChange={(e) => setFormState({ ...formState, moq: Number(e.target.value) || 0 })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="v-lead" className="block text-xs font-semibold text-[#3C3A36]">
                Lead Time (days)
              </label>
              <input
                id="v-lead"
                type="number"
                value={formState.leadTimeDays}
                onChange={(e) =>
                  setFormState({ ...formState, leadTimeDays: Number(e.target.value) || 0 })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="v-rating" className="block text-xs font-semibold text-[#3C3A36]">
                Rating (1-5)
              </label>
              <input
                id="v-rating"
                type="number"
                min={1}
                max={5}
                value={formState.rating}
                onChange={(e) => setFormState({ ...formState, rating: Number(e.target.value) || 4 })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="v-pricing" className="block text-xs font-semibold text-[#3C3A36]">
                Pricing Quote
              </label>
              <input
                id="v-pricing"
                value={formState.pricingSummary}
                onChange={(e) => setFormState({ ...formState, pricingSummary: e.target.value })}
                placeholder="e.g. $24.50 / pc @ 150 pcs"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="v-sample" className="block text-xs font-semibold text-[#3C3A36]">
                Sample Cost
              </label>
              <input
                id="v-sample"
                value={formState.sampleCost}
                onChange={(e) => setFormState({ ...formState, sampleCost: e.target.value })}
                placeholder="e.g. $120 (credited on bulk)"
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="v-last-date" className="block text-xs font-semibold text-[#3C3A36]">
                Last Contacted Date
              </label>
              <input
                id="v-last-date"
                type="date"
                value={formState.lastContactDate}
                onChange={(e) => setFormState({ ...formState, lastContactDate: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="v-next-date" className="block text-xs font-semibold text-[#3C3A36]">
                Next Reach-Out Date
              </label>
              <input
                id="v-next-date"
                type="date"
                value={formState.nextReachOutDate}
                onChange={(e) => setFormState({ ...formState, nextReachOutDate: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="v-last-convo" className="block text-xs font-semibold text-[#3C3A36]">
              Last Conversation Summary
            </label>
            <textarea
              id="v-last-convo"
              rows={2}
              value={formState.lastConversation}
              onChange={(e) => setFormState({ ...formState, lastConversation: e.target.value })}
              placeholder="Summary of the last call, email, or WhatsApp thread..."
              className="mt-1 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] p-3 text-sm"
            />
          </div>

          <div>
            <label htmlFor="v-tags" className="block text-xs font-semibold text-[#3C3A36]">
              Specialties (comma-separated)
            </label>
            <input
              id="v-tags"
              value={formState.specialtyTags}
              onChange={(e) => setFormState({ ...formState, specialtyTags: e.target.value })}
              placeholder="e.g. 460gsm Fleece, Enzyme Wash, Garment Dye"
              className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setVendorModalOpen(false)}
              className="rounded-full border border-[#DFDCD3] px-4 py-2 text-xs font-semibold text-[#4C4A45]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#1C1B19] px-5 py-2 text-xs font-semibold text-white"
            >
              {editingVendorId ? 'Save Changes' : `Add ${isMfg ? 'Manufacturer' : 'Supplier'}`}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Custom Stage Manager Modal */}
      <ModalDialog
        open={stagesModalOpen}
        onClose={() => setStagesModalOpen(false)}
        title={`Manage ${isMfg ? 'Manufacturer' : 'Supplier'} Stages`}
        subtitle="Add custom pipeline statuses (e.g., Price Negotiating, Lab Dip Pending, On Hold)."
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <form onSubmit={handleAddStage} className="flex flex-wrap gap-2">
            <input
              value={newStageLabel}
              onChange={(e) => setNewStageLabel(e.target.value)}
              placeholder="New custom stage name..."
              aria-label="New custom stage name"
              className="h-10 flex-1 rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
            />
            <select
              aria-label="Stage pastel color"
              value={newStageTheme}
              onChange={(e) => setNewStageTheme(e.target.value as PastelTheme)}
              className="h-10 rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-xs font-medium"
            >
              {Object.entries(PASTEL_THEMES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-10 rounded-xl bg-[#1C1B19] px-4 text-xs font-semibold text-white"
            >
              Add Stage
            </button>
          </form>

          <div className="space-y-2">
            {stages.map((st) => {
              const t = PASTEL_THEMES[st.theme] || PASTEL_THEMES.slate;
              return (
                <div
                  key={st.id}
                  className="flex items-center justify-between rounded-2xl border border-[#EFECE6] bg-[#FAF9F6] px-3.5 py-2.5"
                >
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${t.pillBg} ${t.pillText}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                    {st.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#75726B]">
                      {vendors.filter((v) => v.stageId === st.id).length} assigned
                    </span>
                    {stages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteStage(st.id)}
                        aria-label={`Remove ${st.label}`}
                        className="rounded-lg p-1 text-[#8A877F] hover:bg-white hover:text-[#A8382B]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ModalDialog>

      {/* Follow-up Reminder Modal for Vendor */}
      <ModalDialog
        open={Boolean(reminderVendor)}
        onClose={() => setReminderVendor(null)}
        title={`Follow-Up Reminder · ${reminderVendor?.companyName || ''}`}
        subtitle="Set a reminder to follow up and ask for status. Also updates Next Reach-Out Date."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateVendorReminder} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vr-date" className="block text-xs font-semibold text-[#3C3A36]">
                Reminder Date
              </label>
              <input
                id="vr-date"
                type="date"
                value={remDate}
                onChange={(e) => setRemDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="vr-time" className="block text-xs font-semibold text-[#3C3A36]">
                Time
              </label>
              <input
                id="vr-time"
                type="time"
                value={remTime}
                onChange={(e) => setRemTime(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="vr-prompt" className="block text-xs font-semibold text-[#3C3A36]">
              Status Question / Follow-up Note
            </label>
            <textarea
              id="vr-prompt"
              rows={3}
              value={remPrompt}
              onChange={(e) => setRemPrompt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] p-3 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReminderVendor(null)}
              className="rounded-full border border-[#DFDCD3] px-4 py-2 text-xs font-semibold text-[#4C4A45]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1C1B19] px-5 py-2 text-xs font-semibold text-white"
            >
              <CalendarClock className="h-3.5 w-3.5" /> Save Reminder
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
