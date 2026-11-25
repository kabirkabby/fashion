'use client';

import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
} from 'lucide-react';
import { useAkoya } from '@/context/AkoyaContext';
import {
  formatDisplayDate,
  getMonthDaysGrid,
  parsePlainDate,
} from '@/lib/dateUtils';
import { CalendarEvent } from '@/types/akoya';
import { uid } from '@/lib/themes';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { AvatarBadge } from '@/components/ui/AvatarBadge';

interface UnifiedTimelineItem {
  id: string;
  date: string;
  time?: string;
  title: string;
  kind: 'Event' | 'Follow-up' | 'Reminder' | 'Task' | 'Launch' | 'PO ETA';
  pillClass: string;
  subtitle?: string;
  deletableEventId?: string;
}

export default function CalendarPage() {
  const { store, today, updateStore } = useAkoya();
  const todayParsed = parsePlainDate(today);

  const [viewYear, setViewYear] = useState(todayParsed.year);
  const [viewMonth, setViewMonth] = useState(todayParsed.month);
  const [selectedDate, setSelectedDate] = useState(today);
  const [eventModalOpen, setEventModalOpen] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: '',
    date: today,
    time: '11:00',
    category: 'Factory Call' as CalendarEvent['category'],
    notes: '',
  });

  const cells = useMemo(() => getMonthDaysGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthTitle = useMemo(() => {
    const dt = new Date(Date.UTC(viewYear, viewMonth - 1, 1));
    return dt.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  }, [viewYear, viewMonth]);

  const allTimelineItems = useMemo(() => {
    const items: UnifiedTimelineItem[] = [];

    for (const ev of store.calendarEvents) {
      items.push({
        id: ev.id,
        date: ev.date,
        time: ev.time,
        title: ev.title,
        kind: 'Event',
        pillClass: 'bg-[#FCF0C2] text-[#845E07]',
        subtitle: `${ev.category}${ev.notes ? ` · ${ev.notes}` : ''}`,
        deletableEventId: ev.id,
      });
    }

    for (const v of store.vendors) {
      if (v.nextReachOutDate) {
        items.push({
          id: `v-${v.id}`,
          date: v.nextReachOutDate,
          title: `Reach out: ${v.companyName}`,
          kind: 'Follow-up',
          pillClass: 'bg-[#E5E3FA] text-[#4B3EA8]',
          subtitle: `${v.kind === 'manufacturer' ? 'Manufacturer' : 'Supplier'} · ${v.contactName}`,
        });
      }
    }

    for (const r of store.reminders) {
      if (r.status === 'pending') {
        items.push({
          id: `r-${r.id}`,
          date: r.dueDate,
          time: r.dueTime,
          title: r.title,
          kind: 'Reminder',
          pillClass: 'bg-[#FDE2DD] text-[#A8382B]',
          subtitle: r.askStatusPrompt,
        });
      }
    }

    for (const col of store.collections) {
      if (col.launchDate) {
        items.push({
          id: `col-${col.id}`,
          date: col.launchDate,
          title: `Launch: ${col.name}`,
          kind: 'Launch',
          pillClass: 'bg-[#DFF2E6] text-[#1F6B43]',
          subtitle: `${col.code} · ${col.milestoneLabel}`,
        });
      }
    }

    for (const t of store.tasks) {
      if (t.status !== 'Done' && t.dueDate) {
        items.push({
          id: `tsk-${t.id}`,
          date: t.dueDate,
          title: t.title,
          kind: 'Task',
          pillClass: 'bg-[#F7EAD9] text-[#8C521A]',
          subtitle: `${t.priority} Priority`,
        });
      }
    }

    for (const po of store.purchaseOrders) {
      if (po.status !== 'Received' && po.expectedDate) {
        items.push({
          id: `po-${po.id}`,
          date: po.expectedDate,
          title: `${po.poNumber} Delivery ETA`,
          kind: 'PO ETA',
          pillClass: 'bg-[#F8E1EC] text-[#963663]',
          subtitle: `${po.quantity} units expected`,
        });
      }
    }

    return items;
  }, [store]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, UnifiedTimelineItem[]>();
    for (const item of allTimelineItems) {
      const list = map.get(item.date) || [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [allTimelineItems]);

  const selectedDayItems = itemsByDate.get(selectedDate) || [];

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;
    const ev: CalendarEvent = {
      id: uid('evt'),
      title: eventForm.title.trim(),
      date: eventForm.date,
      time: eventForm.time,
      category: eventForm.category,
      notes: eventForm.notes.trim(),
      memberIds: [store.profile.activeMemberId],
    };
    updateStore(
      (prev) => ({
        ...prev,
        calendarEvents: [...prev.calendarEvents, ev],
      }),
      'Calendar event added'
    );
    setSelectedDate(eventForm.date);
    setEventModalOpen(false);
    setEventForm({ ...eventForm, title: '', notes: '' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1A18]">
            Brand Timeline & Calendar
          </h1>
          <p className="mt-0.5 text-sm text-[#6E6C66]">
            Unified calendar combining factory follow-ups, reminders, sample deadlines, PO arrivals, and collection launches.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEventForm({ ...eventForm, date: selectedDate });
            setEventModalOpen(true);
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1C1B19] px-5 text-xs font-semibold text-white"
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Add Timeline Event
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="rounded-full bg-[#FCF0C2] px-3 py-1 text-[#845E07]">Studio Event</span>
        <span className="rounded-full bg-[#E5E3FA] px-3 py-1 text-[#4B3EA8]">Vendor Follow-up</span>
        <span className="rounded-full bg-[#FDE2DD] px-3 py-1 text-[#A8382B]">Reminder</span>
        <span className="rounded-full bg-[#F7EAD9] px-3 py-1 text-[#8C521A]">Task Due</span>
        <span className="rounded-full bg-[#DFF2E6] px-3 py-1 text-[#1F6B43]">Collection Launch</span>
        <span className="rounded-full bg-[#F8E1EC] px-3 py-1 text-[#963663]">PO Arrival</span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Monthly Grid */}
        <div className="rounded-[28px] border border-[#E6E3DA] bg-white p-5 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1B1A18]">{monthTitle}</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setViewYear(todayParsed.year);
                  setViewMonth(todayParsed.month);
                  setSelectedDate(today);
                }}
                className="rounded-full border border-[#DFDCD3] px-3 py-1 text-xs font-semibold text-[#1B1A18] hover:bg-[#F3F2EE]"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#DFDCD3] hover:bg-[#F3F2EE]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#DFDCD3] hover:bg-[#F3F2EE]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-[#75726B]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1.5">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {cells.map((cell) => {
              const dayItems = itemsByDate.get(cell.iso) || [];
              const isToday = cell.iso === today;
              const isSelected = cell.iso === selectedDate;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDate(cell.iso)}
                  className={`flex min-h-[54px] sm:min-h-[86px] flex-col items-stretch rounded-xl sm:rounded-2xl border p-1 sm:p-1.5 text-left transition ${
                    isSelected
                      ? 'border-[#1C1B19] bg-[#FBF7E8] ring-1 ring-[#1C1B19]'
                      : cell.inMonth
                      ? 'border-[#EFECE6] bg-white hover:border-[#D5D1C7]'
                      : 'border-transparent bg-[#FAF9F6] opacity-45'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold tabular-nums ${
                        isToday ? 'bg-[#1C1B19] text-white' : 'text-[#1B1A18]'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="hidden sm:inline text-[10px] font-bold text-[#75726B]">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {/* Mobile dot indicators */}
                  {dayItems.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                      {dayItems.slice(0, 4).map((item) => (
                        <span
                          key={item.id}
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.kind === 'Reminder'
                              ? 'bg-[#D94E3B]'
                              : item.kind === 'Launch'
                              ? 'bg-[#2B8A57]'
                              : item.kind === 'Follow-up'
                              ? 'bg-[#6E5AE6]'
                              : 'bg-[#D97736]'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Desktop/Tablet text pills */}
                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className={`truncate rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${item.pillClass}`}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="px-1 text-[9px] font-semibold text-[#75726B]">
                        +{dayItems.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda */}
        <aside className="rounded-[28px] border border-[#E6E3DA] bg-white p-5 xl:col-span-4">
          <div className="flex items-center justify-between border-b border-[#EFECE6] pb-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8A877F]">
                Day Agenda
              </div>
              <h2 className="text-lg font-bold text-[#1B1A18]">
                {formatDisplayDate(selectedDate, { weekday: true, includeYear: true })}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setEventForm({ ...eventForm, date: selectedDate });
                setEventModalOpen(true);
              }}
              className="rounded-full bg-[#F3F2EE] px-3 py-1.5 text-xs font-semibold text-[#1B1A18] hover:bg-[#EAE7DF]"
            >
              + Event
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {selectedDayItems.length === 0 ? (
              <p className="py-10 text-center text-xs text-[#8A877F]">
                Nothing scheduled on this date.
              </p>
            ) : (
              selectedDayItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#F0EDE6] bg-[#FAF9F6] p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${item.pillClass}`}
                    >
                      {item.kind}
                    </span>
                    <div className="flex items-center gap-2">
                      {item.time && (
                        <span className="flex items-center gap-1 text-[11px] text-[#6E6C66]">
                          <Clock className="h-3 w-3" /> {item.time}
                        </span>
                      )}
                      {item.deletableEventId && (
                        <button
                          type="button"
                          aria-label="Delete event"
                          onClick={() =>
                            updateStore(
                              (prev) => ({
                                ...prev,
                                calendarEvents: prev.calendarEvents.filter(
                                  (e) => e.id !== item.deletableEventId
                                ),
                              }),
                              'Event removed'
                            )
                          }
                          className="text-[#8A877F] hover:text-[#A8382B]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5 text-xs font-bold text-[#1B1A18]">{item.title}</div>
                  {item.subtitle && (
                    <p className="mt-1 text-[11px] text-[#5A5852]">{item.subtitle}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Upcoming Studio Events */}
          <div className="mt-6 border-t border-[#EFECE6] pt-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A877F]">
              Next Studio Milestones
            </div>
            <div className="space-y-2">
              {store.calendarEvents
                .filter((e) => e.date >= today)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 4)
                .map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedDate(ev.date)}
                    className="flex w-full items-center justify-between rounded-xl bg-[#FAF9F6] px-3 py-2 text-left text-xs hover:bg-[#F3F2EE]"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#1B1A18]">{ev.title}</div>
                      <div className="text-[10px] text-[#75726B]">
                        {formatDisplayDate(ev.date)} · {ev.category}
                      </div>
                    </div>
                    <div className="flex -space-x-1">
                      {ev.memberIds.slice(0, 2).map((mid) => (
                        <AvatarBadge
                          key={mid}
                          member={store.team.find((m) => m.id === mid)}
                          size="xs"
                        />
                      ))}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </aside>
      </div>

      <ModalDialog
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title="Add Timeline Event"
        subtitle="Schedule shoots, factory calls, sample reviews, or pop-up dates."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleAddEvent} className="space-y-4">
          <div>
            <label htmlFor="ev-title" className="block text-xs font-semibold text-[#3C3A36]">
              Event Title *
            </label>
            <input
              id="ev-title"
              required
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              placeholder="e.g. Drop 01 Lookbook Shoot"
              className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ev-date" className="block text-xs font-semibold text-[#3C3A36]">
                Date
              </label>
              <input
                id="ev-date"
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="ev-time" className="block text-xs font-semibold text-[#3C3A36]">
                Time
              </label>
              <input
                id="ev-time"
                type="time"
                value={eventForm.time}
                onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ev-cat" className="block text-xs font-semibold text-[#3C3A36]">
              Category
            </label>
            <select
              id="ev-cat"
              value={eventForm.category}
              onChange={(e) =>
                setEventForm({ ...eventForm, category: e.target.value as CalendarEvent['category'] })
              }
              className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
            >
              <option value="Factory Call">Factory Call</option>
              <option value="Sample Due">Sample Due</option>
              <option value="Photoshoot">Photoshoot</option>
              <option value="Pop-Up">Pop-Up</option>
              <option value="Milestone">Milestone</option>
              <option value="Launch">Launch</option>
            </select>
          </div>

          <div>
            <label htmlFor="ev-notes" className="block text-xs font-semibold text-[#3C3A36]">
              Notes
            </label>
            <textarea
              id="ev-notes"
              rows={2}
              value={eventForm.notes}
              onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] p-3 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEventModalOpen(false)}
              className="rounded-full border border-[#DFDCD3] px-4 py-2 text-xs font-semibold text-[#4C4A45]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#1C1B19] px-5 py-2 text-xs font-semibold text-white"
            >
              Save Event
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
