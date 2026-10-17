"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAllParticipants } from "@/app/admin/teams/participant-actions";
import ConfirmDialog from "@/components/confirm-dialog";

export default function DeleteAllParticipantsButton({
  participantCount,
}: {
  participantCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  function executeDelete() {
    setConfirmOpen(false);
    setMessage("");

    startTransition(async () => {
      const result = await deleteAllParticipants();
      setMessage(result.message);

      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={pending || participantCount === 0}
        className="rounded-xl border border-red-500/25 dark:border-red-500/30 bg-red-50/70 dark:bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-400 shadow-sm transition-all duration-150 hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-500/40 dark:hover:border-red-500/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Delete All Participants"}
      </button>

      {message && (
        <p role="status" className="text-sm font-medium text-[#4E404C] dark:text-[#A3A3A3]">
          {message}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete All Participants"
        description={
          <span>
            DANGER: Delete all <strong className="font-semibold text-red-600 dark:text-red-400">{participantCount}</strong> participants and <strong className="font-semibold text-red-600 dark:text-red-400">ALL</strong> teams?
            <br />
            <br />
            This cannot be undone. Admin accounts and authentication data will be preserved.
          </span>
        }
        confirmLabel="Yes, delete everything"
        destructive
        onCancel={() => setConfirmOpen(false)}
        onConfirm={executeDelete}
      />
    </div>
  );
}
