import { PastelTheme } from '@/types/akoya';

export const PASTEL_THEMES: Record<
  PastelTheme,
  {
    cardBg: string;
    cardBorder: string;
    pillBg: string;
    pillText: string;
    dot: string;
    progressFill: string;
    label: string;
  }
> = {
  peach: {
    cardBg: 'bg-[#F7EAD9]',
    cardBorder: 'border-[#E8D5BC]',
    pillBg: 'bg-[#FCEAD2]',
    pillText: 'text-[#8C521A]',
    dot: 'bg-[#D97736]',
    progressFill: 'bg-[#1D1C1A]',
    label: 'Warm Peach',
  },
  sage: {
    cardBg: 'bg-[#DFF2E6]',
    cardBorder: 'border-[#C6E5D1]',
    pillBg: 'bg-[#D7F0E0]',
    pillText: 'text-[#1F6B43]',
    dot: 'bg-[#2B8A57]',
    progressFill: 'bg-[#1D1C1A]',
    label: 'Fresh Sage',
  },
  lavender: {
    cardBg: 'bg-[#E5E3FA]',
    cardBorder: 'border-[#D0CDF5]',
    pillBg: 'bg-[#E3E0FB]',
    pillText: 'text-[#4B3EA8]',
    dot: 'bg-[#6E5AE6]',
    progressFill: 'bg-[#1D1C1A]',
    label: 'Soft Lavender',
  },
  blush: {
    cardBg: 'bg-[#F8E1EC]',
    cardBorder: 'border-[#ECC9DA]',
    pillBg: 'bg-[#FADEEB]',
    pillText: 'text-[#963663]',
    dot: 'bg-[#C44D85]',
    progressFill: 'bg-[#1D1C1A]',
    label: 'Blush Rose',
  },
  amber: {
    cardBg: 'bg-[#FCF0C2]',
    cardBorder: 'border-[#F2DD8D]',
    pillBg: 'bg-[#FDF0B8]',
    pillText: 'text-[#845E07]',
    dot: 'bg-[#D69E14]',
    progressFill: 'bg-[#1D1C1A]',
    label: 'Sunlit Gold',
  },
  slate: {
    cardBg: 'bg-[#ECECE8]',
    cardBorder: 'border-[#DCDCD5]',
    pillBg: 'bg-[#E8E8E3]',
    pillText: 'text-[#4E4D47]',
    dot: 'bg-[#73726B]',
    progressFill: 'bg-[#1D1C1A]',
    label: 'Warm Slate',
  },
};

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
