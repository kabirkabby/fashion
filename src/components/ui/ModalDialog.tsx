'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

/**
 * Native <dialog> modal following modern-web-guidance:
 * - Uses showModal() for built-in top layer, focus containment, inert page & Esc dismissal
 * - Omits redundant role="dialog" / aria-modal
 * - Includes pointerdown/pointerup outside fallback when closedby="any" is unsupported
 */
export function ModalDialog({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClass = 'max-w-2xl',
  children,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pressedOutsideRef.current = isOutside(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutsideRef.current && isOutside(e)) {
        dialog.close();
      }
      pressedOutsideRef.current = false;
    };

    dialog.addEventListener('close', handleClose);
    const hasNativeClosedBy = 'closedBy' in HTMLDialogElement.prototype;
    if (!hasNativeClosedBy) {
      dialog.addEventListener('pointerdown', handlePointerDown);
      dialog.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (!hasNativeClosedBy) {
        dialog.removeEventListener('pointerdown', handlePointerDown);
        dialog.removeEventListener('pointerup', handlePointerUp);
      }
    };
  }, [onClose]);

  if (!open) {
    return (
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        {...({ closedby: 'any' } as Record<string, string>)}
        className="akoya-dialog"
      />
    );
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      className={`akoya-dialog m-auto w-[calc(100vw-1.25rem)] ${maxWidthClass} rounded-[24px] sm:rounded-[28px] border border-[#E5E3DC] bg-white p-0 text-[#1B1A18] shadow-2xl backdrop:bg-black/35 backdrop:backdrop-blur-[2px]`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#EFECE6] px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <h1 id={titleId} className="text-base sm:text-lg font-semibold tracking-tight text-[#1B1A18]">
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-[#6E6C66]">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E7E4DC] bg-[#F8F7F4] text-[#4C4A45] transition hover:bg-[#EFECE6]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[78dvh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
    </dialog>
  );
}
