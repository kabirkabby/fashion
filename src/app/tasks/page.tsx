'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  LayoutGrid,
  List,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAkoya } from '@/context/AkoyaContext';
import { BrandTask } from '@/types/akoya';
import { AvatarBadge } from '@/components/ui/AvatarBadge';
import { addDaysIso, formatDisplayDate } from '@/lib/dateUtils';
import { uid } from '@/lib/themes';
import { ModalDialog } from '@/components/ui/ModalDialog';

const TASK_STATUSES: BrandTask['status'][] = ['Not Started', 'In Progress', 'Blocked', 'Done'];

export default function TasksPage() {
  const { store, today, updateStore } = useAkoya();

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'Not Started' as BrandTask['status'],
    priority: 'Medium' as BrandTask['priority'],
    dueDate: addDaysIso(today, 3),
    assigneeId: store.profile.activeMemberId,
    collectionId: store.collections[0]?.id || '',
    subtasksText: '',
  });

  const filteredTasks = useMemo(() => {
    return store.tasks.filter((t) => {
      if (assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) return false;
      if (collectionFilter !== 'all' && t.collectionId !== collectionFilter) return false;
      return true;
    });
  }, [store.tasks, assigneeFilter, collectionFilter]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const checklist = form.subtasksText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({ id: uid('chk'), text, done: false }));

    const task: BrandTask = {
      id: uid('tsk'),
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate,
      assigneeId: form.assigneeId || store.team[0]?.id || 'tm-1',
      collectionId: form.collectionId || undefined,
      checklist,
    };

    updateStore(
      (prev) => ({
        ...prev,
        tasks: [task, ...prev.tasks],
      }),
      'Task created'
    );
    setForm({ ...form, title: '', description: '', subtasksText: '' });
    setModalOpen(false);
  };

  const toggleChecklistItem = (taskId: string, itemId: string) => {
    updateStore((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              checklist: t.checklist.map((c) =>
                c.id === itemId ? { ...c, done: !c.done } : c
              ),
            }
          : t
      ),
    }));
  };

  const updateTaskStatus = (taskId: string, status: BrandTask['status']) => {
    updateStore((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1A18]">Brand Tasks</h1>
          <p className="mt-0.5 text-sm text-[#6E6C66]">
            Assign sampling reviews, factory deposits, lookbook shoots, and launch operations across your team.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by team member"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-10 rounded-full border border-[#DFDCD3] bg-white px-3.5 text-xs font-medium"
          >
            <option value="all">All Members</option>
            {store.team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by collection"
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="h-10 rounded-full border border-[#DFDCD3] bg-white px-3.5 text-xs font-medium"
          >
            <option value="all">All Collections</option>
            {store.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-full border border-[#DFDCD3] bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                viewMode === 'board' ? 'bg-[#1C1B19] text-white' : 'text-[#5A5852]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                viewMode === 'list' ? 'bg-[#1C1B19] text-white' : 'text-[#5A5852]'
              }`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({ ...prev, dueDate: addDaysIso(today, 3) }));
              setModalOpen(true);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1C1B19] px-5 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" /> New Task
          </button>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUSES.map((st) => {
            const items = filteredTasks.filter((t) => t.status === st);
            const columnTint =
              st === 'Done'
                ? 'bg-[#DFF2E6]/70 border-[#C6E5D1]'
                : st === 'In Progress'
                ? 'bg-[#FCF0C2]/65 border-[#EFE0A5]'
                : st === 'Blocked'
                ? 'bg-[#F8E1EC]/75 border-[#ECC9DA]'
                : 'bg-[#ECECE8]/75 border-[#DCDCD5]';

            return (
              <section key={st} className={`rounded-[26px] border p-4 ${columnTint}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#1B1A18]">
                    {st}
                  </h2>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#1B1A18]">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-black/15 bg-white/40 p-5 text-center text-xs text-[#6E6C66]">
                      No {st.toLowerCase()} tasks
                    </div>
                  ) : (
                    items.map((task) => {
                      const assignee = store.team.find((m) => m.id === task.assigneeId);
                      const col = store.collections.find((c) => c.id === task.collectionId);
                      return (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-white bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                        >
                          <div className="flex items-start justify-between gap-2">
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
                            <button
                              type="button"
                              aria-label="Delete task"
                              onClick={() =>
                                updateStore(
                                  (prev) => ({
                                    ...prev,
                                    tasks: prev.tasks.filter((x) => x.id !== task.id),
                                  }),
                                  'Task deleted'
                                )
                              }
                              className="text-[#96938B] hover:text-[#A8382B]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <h3 className="mt-2 text-xs font-bold text-[#1B1A18]">{task.title}</h3>
                          {task.description && (
                            <p className="mt-1 text-[11px] leading-relaxed text-[#6E6C66]">
                              {task.description}
                            </p>
                          )}

                          {task.checklist.length > 0 && (
                            <div className="mt-2.5 space-y-1 border-t border-[#F2EFE8] pt-2">
                              {task.checklist.map((chk) => (
                                <button
                                  key={chk.id}
                                  type="button"
                                  onClick={() => toggleChecklistItem(task.id, chk.id)}
                                  className="flex w-full items-center gap-2 text-left text-[11px]"
                                >
                                  <span
                                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                      chk.done
                                        ? 'border-[#1C1B19] bg-[#1C1B19] text-white'
                                        : 'border-[#C8C4BA]'
                                    }`}
                                  >
                                    {chk.done && <Check className="h-2.5 w-2.5" />}
                                  </span>
                                  <span
                                    className={
                                      chk.done ? 'text-[#8E8B83] line-through' : 'text-[#3C3A36]'
                                    }
                                  >
                                    {chk.text}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F2EFE8] pt-2.5">
                            <div className="flex items-center gap-1.5">
                              <AvatarBadge member={assignee} size="xs" />
                              <span className="text-[10px] font-medium text-[#6E6C66]">
                                {formatDisplayDate(task.dueDate)}
                              </span>
                            </div>
                            <select
                              aria-label="Change task status"
                              value={task.status}
                              onChange={(e) =>
                                updateTaskStatus(task.id, e.target.value as BrandTask['status'])
                              }
                              className="h-7 rounded-lg border border-[#E5E2DA] bg-[#FAF9F6] px-1.5 text-[10px] font-semibold"
                            >
                              {TASK_STATUSES.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                          {col && (
                            <div className="mt-1.5 text-[10px] font-medium text-[#75726B]">
                              {col.code} · {col.name}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[#E6E3DA] bg-white">
          <div tabIndex={0} role="region" aria-label="Tasks table" className="akoya-table-wrapper">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-[#EFECE6] bg-[#FAF9F6] text-[11px] font-semibold uppercase tracking-wider text-[#75726B]">
                <tr>
                  <th className="px-4 py-3.5">Task</th>
                  <th className="px-3 py-3.5">Collection</th>
                  <th className="px-3 py-3.5">Assignee</th>
                  <th className="px-3 py-3.5">Due Date</th>
                  <th className="px-3 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE8]">
                {filteredTasks.map((t) => {
                  const assignee = store.team.find((m) => m.id === t.assigneeId);
                  const col = store.collections.find((c) => c.id === t.collectionId);
                  return (
                    <tr key={t.id} className="hover:bg-[#FAF9F6]">
                      <th className="px-4 py-3.5 font-medium text-[#1B1A18]">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-3.5 w-3.5 text-[#75726B]" />
                          <span>{t.title}</span>
                        </div>
                      </th>
                      <td className="px-3 py-3.5 text-[#5A5852]">{col?.code || 'General'}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <AvatarBadge member={assignee} size="xs" />
                          <span>{assignee?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-[#5A5852]">{formatDisplayDate(t.dueDate)}</td>
                      <td className="px-3 py-3.5">
                        <span className="rounded-full bg-[#F3F2EE] px-2.5 py-0.5 text-[10px] font-semibold">
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          aria-label={`Status for ${t.title}`}
                          value={t.status}
                          onChange={(e) =>
                            updateTaskStatus(t.id, e.target.value as BrandTask['status'])
                          }
                          className="h-8 rounded-xl border border-[#DFDCD3] bg-white px-2 text-xs font-semibold"
                        >
                          {TASK_STATUSES.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ModalDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Brand Task"
        subtitle="Assign work to your team and link it to a collection."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label htmlFor="t-title" className="block text-xs font-semibold text-[#3C3A36]">
              Task Title *
            </label>
            <input
              id="t-title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Confirm neck label woven proof"
              className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="t-assignee" className="block text-xs font-semibold text-[#3C3A36]">
                Assignee
              </label>
              <select
                id="t-assignee"
                value={form.assigneeId}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              >
                {store.team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="t-col" className="block text-xs font-semibold text-[#3C3A36]">
                Collection
              </label>
              <select
                id="t-col"
                value={form.collectionId}
                onChange={(e) => setForm({ ...form, collectionId: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              >
                <option value="">General</option>
                {store.collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="t-due" className="block text-xs font-semibold text-[#3C3A36]">
                Due Date
              </label>
              <input
                id="t-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="t-pri" className="block text-xs font-semibold text-[#3C3A36]">
                Priority
              </label>
              <select
                id="t-pri"
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value as BrandTask['priority'] })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label htmlFor="t-stat" className="block text-xs font-semibold text-[#3C3A36]">
                Status
              </label>
              <select
                id="t-stat"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as BrandTask['status'] })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="t-desc" className="block text-xs font-semibold text-[#3C3A36]">
              Details
            </label>
            <textarea
              id="t-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] p-3 text-sm"
            />
          </div>

          <div>
            <label htmlFor="t-sub" className="block text-xs font-semibold text-[#3C3A36]">
              Checklist Subtasks (one per line)
            </label>
            <textarea
              id="t-sub"
              rows={2}
              value={form.subtasksText}
              onChange={(e) => setForm({ ...form, subtasksText: e.target.value })}
              placeholder={'Measure chest grading\nCheck wash shrinkage'}
              className="mt-1 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] p-3 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-full border border-[#DFDCD3] px-4 py-2 text-xs font-semibold text-[#4C4A45]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#1C1B19] px-5 py-2 text-xs font-semibold text-white"
            >
              Create Task
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
