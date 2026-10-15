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
        className="rounded-xl border border-red-500/25 bg-red-50/70 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition-all duration-150 hover:bg-red-100 hover:border-red-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Delete All Participants"}
      </button>

      {message && (
        <p role="status" className="text-sm font-medium text-[#4E404C]">
          {message}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete All Participants"
        description={
          <span>
            DANGER: Delete all <strong className="font-semibold text-red-600">{participantCount}</strong> participants and <strong className="font-semibold text-red-600">ALL</strong> teams?
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
