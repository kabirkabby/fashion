'use client';

import React, { useState } from 'react';
import { Check, Mail, Trash2, UserPlus } from 'lucide-react';
import { useAkoya } from '@/context/AkoyaContext';
import { AvatarBadge } from '@/components/ui/AvatarBadge';
import { TeamMember } from '@/types/akoya';
import { uid } from '@/lib/themes';
import { ModalDialog } from '@/components/ui/ModalDialog';

const AVATAR_COLORS = ['#1E1D1B', '#2F6F5E', '#6E5AE6', '#D97736', '#B93829', '#2563EB'];

export default function TeamPage() {
  const { store, updateStore } = useAkoya();
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    role: 'Production & Sourcing',
    email: '',
    status: 'online' as TeamMember['status'],
    weeklyCapacityHours: 32,
    avatarColor: AVATAR_COLORS[1],
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const parts = form.name.trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : form.name.trim().slice(0, 2).toUpperCase();

    const member: TeamMember = {
      id: uid('tm'),
      name: form.name.trim(),
      role: form.role.trim() || 'Team Member',
      email: form.email.trim(),
      initials,
      avatarColor: form.avatarColor,
      status: form.status,
      weeklyCapacityHours: Number(form.weeklyCapacityHours) || 30,
    };

    updateStore(
      (prev) => ({
        ...prev,
        team: [...prev.team, member],
      }),
      `Added ${member.name} to the team`
    );
    setForm({ ...form, name: '', email: '' });
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1A18]">
            Brand Team & Collaboration
          </h1>
          <p className="mt-0.5 text-sm text-[#6E6C66]">
            Add founders, technical designers, sourcing leads, and ops members to collaborate across tasks and collections.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1C1B19] px-5 text-xs font-semibold text-white"
        >
          <UserPlus className="h-3.5 w-3.5" /> Add Team Member
        </button>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {store.team.map((member) => {
          const assignedTasks = store.tasks.filter((t) => t.assigneeId === member.id);
          const doneTasks = assignedTasks.filter((t) => t.status === 'Done').length;
          const pct =
            assignedTasks.length > 0
              ? Math.round((doneTasks / assignedTasks.length) * 100)
              : 100;
          const memberReminders = store.reminders.filter(
            (r) => r.assigneeId === member.id && r.status === 'pending'
          ).length;
          const isActive = store.profile.activeMemberId === member.id;

          return (
            <div
              key={member.id}
              className={`rounded-[28px] border bg-white p-5 transition ${
                isActive ? 'border-[#1C1B19] ring-1 ring-[#1C1B19]' : 'border-[#E6E3DA]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarBadge member={member} size="lg" showStatus />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-bold text-[#1B1A18]">
                        {member.name}
                      </h2>
                      {isActive && (
                        <span className="rounded-full bg-[#FCF0C2] px-2 py-0.5 text-[10px] font-bold text-[#845E07]">
                          You
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#6E6C66]">{member.role}</p>
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#75726B] hover:text-[#1B1A18]"
                      >
                        <Mail className="h-3 w-3" /> {member.email}
                      </a>
                    )}
                  </div>
                </div>

                {store.team.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove ${member.name}`}
                    onClick={() =>
                      updateStore(
                        (prev) => {
                          const nextTeam = prev.team.filter((m) => m.id !== member.id);
                          return {
                            ...prev,
                            team: nextTeam,
                            profile: {
                              ...prev.profile,
                              activeMemberId:
                                prev.profile.activeMemberId === member.id
                                  ? nextTeam[0]?.id || ''
                                  : prev.profile.activeMemberId,
                            },
                          };
                        },
                        `Removed ${member.name}`
                      )
                    }
                    className="rounded-full p-1.5 text-[#8A877F] hover:bg-[#FDF1EE] hover:text-[#A8382B]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-[#EFECE6] bg-[#FAF9F6] p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#5A5852]">Task Completion</span>
                  <span className="font-bold text-[#1B1A18] tabular-nums">
                    {doneTasks}/{assignedTasks.length} ({pct}%)
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E5E2DA]">
                  <div
                    className="h-full rounded-full bg-[#1C1B19]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#6E6C66]">
                  <span>{memberReminders} follow-ups assigned</span>
                  <span>{member.weeklyCapacityHours}h / week</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <select
                  aria-label={`Availability status for ${member.name}`}
                  value={member.status}
                  onChange={(e) => {
                    const status = e.target.value as TeamMember['status'];
                    updateStore((prev) => ({
                      ...prev,
                      team: prev.team.map((m) =>
                        m.id === member.id ? { ...m, status } : m
                      ),
                    }));
                  }}
                  className="h-8 rounded-full border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-xs font-medium"
                >
                  <option value="online">Online</option>
                  <option value="busy">In Studio / Busy</option>
                  <option value="away">Away</option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    updateStore(
                      (prev) => ({
                        ...prev,
                        profile: { ...prev.profile, activeMemberId: member.id },
                      }),
                      `Switched workspace view to ${member.name}`
                    )
                  }
                  disabled={isActive}
                  className={`inline-flex h-8 items-center gap-1 rounded-full px-3.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#DFF2E6] text-[#1F6B43]'
                      : 'bg-[#1C1B19] text-white hover:bg-[#32302C]'
                  }`}
                >
                  {isActive && <Check className="h-3 w-3" />}
                  {isActive ? 'Active User' : 'Switch to Member'}
                </button>
              </div>
            </div>
          );
        })}

        {/* Dashed Quick Add Card (inspired by Sample 1) */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex min-h-[210px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#D5D1C7] bg-[#FAF9F6] p-6 text-center transition hover:border-[#1C1B19] hover:bg-white"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#1B1A18] shadow-sm ring-1 ring-[#E5E2DA]">
            <UserPlus className="h-5 w-5" />
          </span>
          <div className="mt-3 text-sm font-bold text-[#1B1A18]">Add Team Collaborator</div>
          <p className="mt-1 max-w-[220px] text-xs text-[#6E6C66]">
            Invite co-founders, pattern makers, social media, or fulfillment leads.
          </p>
        </button>
      </div>

      <ModalDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Team Member"
        subtitle="Add a collaborator to assign tasks, reminders, and collection ownership."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label htmlFor="tm-name" className="block text-xs font-semibold text-[#3C3A36]">
              Full Name *
            </label>
            <input
              id="tm-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Elena Vance"
              className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
            />
          </div>

          <div>
            <label htmlFor="tm-role" className="block text-xs font-semibold text-[#3C3A36]">
              Role in Brand *
            </label>
            <input
              id="tm-role"
              required
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="e.g. Technical Designer / Creative Director"
              className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="tm-email" className="block text-xs font-semibold text-[#3C3A36]">
                Email
              </label>
              <input
                id="tm-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="tm-cap" className="block text-xs font-semibold text-[#3C3A36]">
                Weekly Hours
              </label>
              <input
                id="tm-cap"
                type="number"
                value={form.weeklyCapacityHours}
                onChange={(e) =>
                  setForm({ ...form, weeklyCapacityHours: Number(e.target.value) || 20 })
                }
                className="mt-1 h-10 w-full rounded-xl border border-[#DFDCD3] bg-[#FAF9F6] px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#3C3A36]">Avatar Accent</span>
            <div className="mt-2 flex gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, avatarColor: color })}
                  style={{ backgroundColor: color }}
                  className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ${
                    form.avatarColor === color ? 'ring-[#1C1B19]' : 'ring-transparent'
                  }`}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              Add Member
            </button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
