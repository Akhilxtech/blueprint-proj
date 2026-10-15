"use client";

import { useEffect, useRef } from "react";

export type ConfirmDialogProps = {
  open?: boolean;
  isOpen?: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  isDestructive?: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive,
  isDestructive,
  isLoading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isCurrentlyOpen = Boolean(open ?? isOpen);
  const isDestructiveAction = Boolean(destructive ?? isDestructive);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isCurrentlyOpen && !dialog.open) dialog.showModal();
    if (!isCurrentlyOpen && dialog.open) dialog.close();
  }, [isCurrentlyOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/80 bg-white/95 p-0 text-[#302630] shadow-[0_24px_80px_rgba(78,40,62,0.18)] backdrop:bg-[#302630]/35 backdrop:backdrop-blur-sm animate-fade-in"
    >
      <div className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D9468D]">
          Please confirm
        </p>
        <h2 id="confirm-dialog-title" className="mt-2 text-xl font-bold tracking-tight text-[#302630]">
          {title}
        </h2>
        <div id="confirm-dialog-description" className="mt-3 text-sm leading-6 text-[#4E404C]">
          {description}
        </div>
        <div className="mt-6 flex flex-col-reverse justify-end gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="min-h-11 rounded-xl border border-[#E7DCE4] bg-white px-4 py-2.5 text-sm font-semibold text-[#302630] transition hover:bg-[#F1E9EF] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9468D] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9468D] disabled:opacity-50 ${
              isDestructiveAction
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#BE3477] hover:bg-[#a62a66]"
            }`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export { ConfirmDialog };