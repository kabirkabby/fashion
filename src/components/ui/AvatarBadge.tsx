'use client';

import React from 'react';
import { TeamMember } from '@/types/akoya';

export function AvatarBadge({
  member,
  size = 'md',
  showStatus = false,
}: {
  member?: TeamMember;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}) {
  const sizeClass =
    size === 'xs'
      ? 'h-6 w-6 text-[10px]'
      : size === 'sm'
      ? 'h-7 w-7 text-[11px]'
      : size === 'lg'
      ? 'h-11 w-11 text-sm'
      : 'h-9 w-9 text-xs';

  const bg = member?.avatarColor || '#1F1F1D';
  const initials = member?.initials || 'AK';

  const statusDot =
    member?.status === 'online'
      ? 'bg-emerald-500'
      : member?.status === 'busy'
      ? 'bg-amber-400'
      : 'bg-stone-400';

  return (
    <span className="relative inline-flex shrink-0 items-center justify-center">
      <span
        style={{ backgroundColor: bg }}
        className={`${sizeClass} inline-flex items-center justify-center rounded-full font-semibold tracking-tight text-white ring-2 ring-white`}
        title={member ? `${member.name} · ${member.role}` : undefined}
      >
        {initials}
      </span>
      {showStatus && member && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${statusDot}`}
        />
      )}
    </span>
  );
}
