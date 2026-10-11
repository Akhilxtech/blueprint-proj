
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAllParticipants } from "@/app/admin/teams/participant-actions";

export default function DeleteAllParticipantsButton({
  participantCount,
}: {
  participantCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleDelete() {
   const confirmed = window.confirm(
  `DANGER: Delete all ${participantCount} participants and ALL teams?\n\n` +
    "This cannot be undone. Admin accounts and authentication data will be preserved.",
);

    if (!confirmed) return;

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
        onClick={handleDelete}
        disabled={pending || participantCount === 0}
        className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Delete All Participants"}
      </button>

      {message && (
        <p role="status" className="text-sm text-zinc-300">
          {message}
        </p>
      )}
    </div>
  );
}
