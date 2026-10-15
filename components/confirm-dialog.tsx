"use client";

import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-[0_24px_80px_rgba(48,38,48,0.24)] backdrop:bg-[rgba(48,38,48,0.35)]"
    >
      <div className="p-6 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Please confirm
        </p>
        <h2 id="confirm-dialog-title" className="mt-2 text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-3 text-sm leading-6 text-foreground-secondary">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${destructive ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary-bright"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}