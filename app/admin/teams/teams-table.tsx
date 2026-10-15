
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { deleteEmptyTeam } from "./teams-actions";
import ConfirmDialog from "@/components/confirm-dialog";

import {

  deleteParticipant,

  updateParticipant,

  type UpdateParticipantInput,

} from "./participant-actions";

type Member = {

  id: string;

  name: string;

  email: string;

  usn: string | null;

  phone: string | null;

  semester: string | null;

  branch: string | null;

};

type Team = {
  id: string;
  name: string;
  members: Member[];
  quizStatus: "ACTIVE" | "ELIMINATED";
  warningCount: number;
  eliminatedAt: string | null;
};
type DeleteTarget =
  | { type: "participant"; member: Member }
  | { type: "team"; team: Team };

type EditForm = {

  participantId: string;

  name: string;

  email: string;

  usn: string;

  phone: string;

  semester: string;

  branch: string;

  teamId: string;

  overrideTeamLimit: boolean;

};

const inputClass =
  "mt-1 w-full rounded-xl border border-[#E7DCE4] bg-white px-3.5 py-2.5 text-sm text-[#302630] outline-none placeholder:text-[#4E404C]/50 focus:border-[#D9468D] focus:ring-2 focus:ring-[#D9468D]/20";

export default function TeamsTable({
  initialTeams,
  maxWarnings,
}: {
  initialTeams: Team[];
  maxWarnings: number;
}) {
  const [teamActionLoading, setTeamActionLoading] = useState<string | null>(null);

  const router = useRouter();

  const [teams, setTeams] = useState(initialTeams);

  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");

  const [isPending, startTransition] = useTransition();

  const [editing, setEditing] = useState<EditForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Team | null>(null);

  useEffect(() => {
  const interval = window.setInterval(() => {
    router.refresh();
  }, 2000);

  return () => window.clearInterval(interval);
}, [router]);

const displayedTeams = useMemo(
  () =>
    teams.map((team) => {
      const refreshed = initialTeams.find((item) => item.id === team.id);

      return refreshed
        ? {
            ...team,
            quizStatus: refreshed.quizStatus,
            warningCount: refreshed.warningCount,
            eliminatedAt: refreshed.eliminatedAt,
          }
        : team;
    }),
  [teams, initialTeams],
);

 const filteredTeams = useMemo(() => {
  const query = search.trim().toLowerCase();

  if (!query) return displayedTeams;

  return displayedTeams.filter((team) => {

      return (

team.name.toLowerCase().includes(query) ||

team.members.some(

          (member) =>

member.name.toLowerCase().includes(query) ||

member.email.toLowerCase().includes(query) ||

            (member.usn ?? "").toLowerCase().includes(query),

        )

      );

    });

  }, [displayedTeams, search]);
  const targetTeam = editing

    ? teams.find((team) => team.id === editing.teamId)

    : undefined;

  const originalTeam = editing

    ? teams.find((team) =>

team.members.some((member) => member.id === editing.participantId),

      )

    : undefined;

  const exceedsLimit =

    !!editing &&

    !!targetTeam &&

    targetTeam.id !== originalTeam?.id &&

    targetTeam.members.length + 1 > 3;


    async function handleWarningChange(team: Team, delta: 1 | -1) {
  if (teamActionLoading) return;

  setTeamActionLoading(team.id);
  setMessage("");

  try {
    const response = await fetch(
      `/api/admin/teams/${encodeURIComponent(team.id)}/warnings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      },
    );

    const data = (await response.json()) as {
      error?: string;
      warningCount?: number;
      quizStatus?: "ACTIVE" | "ELIMINATED";
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Could not update team warnings.");
    }

    setMessage(
      `${team.name}: warning count updated to ${data.warningCount}.`,
    );
    router.refresh();
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Could not update team warnings.",
    );
  } finally {
    setTeamActionLoading(null);
  }
}

function handleRestoreTeam(team: Team) {
  if (teamActionLoading) return;
  setRestoreTarget(team);
}

async function executeRestore() {
  const team = restoreTarget;
  setRestoreTarget(null);
  if (!team || teamActionLoading) return;

  setTeamActionLoading(team.id);
  setMessage("");

  try {
    const response = await fetch(
      `/api/admin/teams/${encodeURIComponent(team.id)}/restore`,
      { method: "POST" },
    );

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "Could not restore team.");
    }

    setMessage(`${team.name} restored successfully.`);
    router.refresh();
  } catch (error) {
    setMessage(
      error instanceof Error ? error.message : "Could not restore team.",
    );
  } finally {
    setTeamActionLoading(null);
  }
}

  function handleDeleteTeam(team: Team) {
    if (team.members.length !== 0 || isPending) return;
    setMessage("");
    setDeleteTarget({ type: "team", team });
  }

  function openEdit(team: Team, member: Member) {

    setMessage("");

    setEditing({

      participantId: member.id,

      name: member.name,

      email: member.email,

      usn: member.usn ?? "",

      phone: member.phone ?? "",

      semester: member.semester ?? "",

      branch: member.branch ?? "",

      teamId: team.id,

      overrideTeamLimit: false,

    });

  }

  function updateField(field: keyof EditForm, value: string | boolean) {

    setEditing((current) =>

current ? { ...current, [field]: value } : current,

    );

  }

  function handleUpdate(event: React.FormEvent<HTMLFormElement>) {

event.preventDefault();

    if (!editing) return;

    setMessage("");

    const input: UpdateParticipantInput = {

      ...editing,

      name: editing.name.trim(),

      email: editing.email.trim().toLowerCase(),

      usn: editing.usn.trim(),

      phone: editing.phone.trim(),

      semester: editing.semester.trim(),

      branch: editing.branch.trim(),

    };

    startTransition(async () => {

      const result = await updateParticipant(input);

      if (!result.success) {

        setMessage(result.message);

        return;

      }

      setEditing(null);

      setMessage(result.message);

      router.refresh();

    });

  }

  function handleDeleteParticipant(member: Member) {
    if (isPending) return;
    setMessage("");
    setDeleteTarget({ type: "participant", member });
  }

  function confirmDelete() {
    if (!deleteTarget || isPending) return;

    const target = deleteTarget;
    setMessage("");

    startTransition(async () => {
      if (target.type === "team") {
        const result = await deleteEmptyTeam(target.team.id);

        if (!result.success) {
          setMessage(result.error);
          setDeleteTarget(null);
          return;
        }

        setTeams((current) =>
          current.filter((team) => team.id !== target.team.id),
        );
        setMessage(`Deleted ${target.team.name}.`);
      } else {
        const result = await deleteParticipant(target.member.id);

        if (!result.success) {
          setMessage(result.message);
          setDeleteTarget(null);
          return;
        }

        setTeams((current) =>
          current.map((team) => ({
            ...team,
            members: team.members.filter(
              (member) => member.id !== target.member.id,
            ),
          })),
        );
        setMessage(result.message);
      }

      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (

    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search teams, names, emails, or USNs..."
          aria-label="Search teams and participants"
          className="w-full rounded-2xl border border-[#E7DCE4] bg-white px-4 py-2.5 text-sm text-[#302630] outline-none placeholder:text-[#4E404C]/50 focus:border-[#D9468D] focus:ring-2 focus:ring-[#D9468D]/20 shadow-xs sm:max-w-md"
        />

        <p className="text-xs font-semibold text-[#4E404C]">
          {filteredTeams.length} of {teams.length} teams
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-2xl border border-[#D9468D]/25 bg-[#FCE7F1]/80 p-3 text-xs font-semibold text-[#BE3477] shadow-xs"
        >
          {message}
        </div>
      )}

      <div className="glass-panel overflow-x-auto rounded-3xl border border-white/80 shadow-xs">
        <table className="w-full min-w-[850px] border-collapse text-left text-sm">
          <thead className="bg-[#F1E9EF]/60 text-xs font-bold uppercase tracking-wider text-[#4E404C] border-b border-[#E7DCE4]">
            <tr>
              <th className="px-5 py-3.5">Team</th>
              <th className="px-5 py-3.5">Members</th>
              <th className="px-5 py-3.5">Member count</th>
              <th className="px-5 py-3.5">Team action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E7DCE4]/70 bg-white/40">
            {filteredTeams.map((team) => (
              <tr key={team.id} className="align-top hover:bg-white/70 transition-colors">
                <td className="px-5 py-4 font-bold text-[#302630]">{team.name}</td>

                <td className="px-5 py-4">
                  {team.members.length === 0 ? (
                    <span className="text-xs font-medium text-[#4E404C]/70">No members assigned</span>
                  ) : (
                    <ul className="space-y-4">
                      {team.members.map((member) => (
                        <li key={member.id} className="rounded-2xl border border-[#E7DCE4] bg-white/70 p-3 shadow-2xs">
                          <p className="font-bold text-[#302630]">
                            {member.name}
                          </p>
                          <p className="text-xs text-[#4E404C]">{member.email}</p>

                          {(member.usn ||
                            member.phone ||
                            member.semester ||
                            member.branch) && (
                            <p className="mt-1 text-[11px] text-[#4E404C]">
                              {[
                                member.usn,
                                member.phone,
                                member.semester
                                  ? `${member.semester}th sem`
                                  : null,
                                member.branch,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}

                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => openEdit(team, member)}
                              className="rounded-xl border border-[#D9468D]/30 bg-[#FCE7F1]/70 px-2.5 py-1 text-xs font-bold text-[#BE3477] shadow-2xs transition hover:bg-[#FCE7F1] disabled:opacity-50"
                            >
                              Edit / Move
                            </button>

                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleDeleteParticipant(member)}
                              className="rounded-xl border border-red-500/25 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 shadow-2xs transition hover:bg-red-100 disabled:opacity-50"
                            >
                              Delete member
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>

                <td className="px-5 py-4">
                  <span className="rounded-full bg-[#F1E9EF] px-3 py-1 text-xs font-bold text-[#4E404C]">
                    {team.members.length} {team.members.length === 1 ? "member" : "members"}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <div className="flex min-w-48 flex-col items-start gap-2.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        team.quizStatus === "ELIMINATED"
                          ? "bg-red-500/15 text-red-700"
                          : "bg-emerald-500/15 text-emerald-800"
                      }`}
                    >
                      {team.quizStatus}
                    </span>

                    <div className="text-xs text-[#4E404C]">
                      Warnings:{" "}
                      <span className="font-bold text-[#302630]">
                        {team.warningCount}
                        {maxWarnings > 0 ? ` / ${maxWarnings}` : ""}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={
                          !!teamActionLoading ||
                          team.warningCount === 0
                        }
                        onClick={() => handleWarningChange(team, -1)}
                        className="rounded-xl border border-[#E7DCE4] bg-white px-2.5 py-1 text-xs font-bold text-[#4E404C] shadow-2xs hover:bg-[#FAF6F8] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        - Warning
                      </button>

                      <button
                        type="button"
                        disabled={!!teamActionLoading}
                        onClick={() => handleWarningChange(team, 1)}
                        className="rounded-xl border border-amber-500/30 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        + Warning
                      </button>

                      {team.quizStatus === "ELIMINATED" && (
                        <button
                          type="button"
                          disabled={!!teamActionLoading}
                          onClick={() => handleRestoreTeam(team)}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {teamActionLoading === team.id
                            ? "Processing..."
                            : "Restore team"}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={
                          team.members.length !== 0 ||
                          isPending ||
                          !!teamActionLoading
                        }
                        onClick={() => handleDeleteTeam(team)}
                        className="rounded-xl border border-red-500/30 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 shadow-2xs transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30"
                        title={
                          team.members.length
                            ? "Only empty teams can be deleted"
                            : "Delete empty team"
                        }
                      >
                        Delete empty team
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}

            {filteredTeams.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-xs text-[#4E404C]">
                  No matching teams or participants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Participant Dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#302630]/40 backdrop-blur-sm p-4">
          <form
            onSubmit={handleUpdate}
            className="my-auto max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl border border-white/80 bg-white/95 p-6 sm:p-8 text-[#302630] shadow-2xl animate-fade-in"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E7DCE4] pb-4">
              <div>
                <span className="rounded-full bg-[#FCE7F1] px-2.5 py-0.5 text-xs font-bold text-[#BE3477]">
                  Participant Details
                </span>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-[#302630]">
                  Edit Participant
                </h2>
                <p className="text-xs text-[#4E404C]">
                  Update member details or reassign them to another registered team.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-[#E7DCE4] bg-white px-3 py-1.5 text-xs font-bold text-[#4E404C] hover:text-[#BE3477]"
                aria-label="Close edit form"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
                Full name *
                <input
                  className={inputClass}
                  value={editing.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </label>

              <label className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
                Gmail address *
                <input
                  className={inputClass}
                  type="email"
                  pattern="[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com"
                  title="Enter an email address ending in @gmail.com"
                  value={editing.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                />
              </label>

              <label className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
                USN
                <input
                  className={inputClass}
                  value={editing.usn}
                  onChange={(event) => updateField("usn", event.target.value)}
                />
              </label>

              <label className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
                Phone
                <input
                  className={inputClass}
                  type="tel"
                  value={editing.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </label>

              <label className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
                Semester
                <select
                  className={inputClass}
                  value={editing.semester}
                  onChange={(event) =>
                    updateField("semester", event.target.value)
                  }
                >
                  <option value="">Select semester</option>
                  {[3, 4, 5, 6, 7].map((semester) => (
                    <option key={semester} value={String(semester)}>
                      {semester}th semester
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
                Branch
                <input
                  className={inputClass}
                  value={editing.branch}
                  onChange={(event) => updateField("branch", event.target.value)}
                />
              </label>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider text-[#4E404C]">
              Team *
              <select
                className={inputClass}
                value={editing.teamId}
                onChange={(event) => {
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          teamId: event.target.value,
                          overrideTeamLimit: false,
                        }
                      : current,
                  );
                }}
                required
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.members.length} members)
                  </option>
                ))}
              </select>
            </label>

            {exceedsLimit && (
              <label className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-50 p-3.5 text-xs font-medium text-amber-800">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded accent-[#BE3477]"
                  checked={editing.overrideTeamLimit}
                  onChange={(event) =>
                    updateField("overrideTeamLimit", event.target.checked)
                  }
                />
                Allow destination team to exceed 3 members limit.
              </label>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#E7DCE4] pt-5">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={isPending}
                className="rounded-xl border border-[#E7DCE4] bg-white px-4 py-2.5 text-sm font-semibold text-[#302630] hover:bg-[#F1E9EF]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-[#BE3477] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#a62a66] active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          open={deleteTarget !== null}
          title={
            deleteTarget.type === "participant"
              ? "Delete Participant?"
              : "Delete Empty Team?"
          }
          description={
            deleteTarget.type === "participant" ? (
              <span>
                Are you sure you want to delete{" "}
                <strong className="font-bold text-[#302630]">
                  {deleteTarget.member.name}
                </strong>{" "}
                ({deleteTarget.member.email})? This action cannot be undone.
              </span>
            ) : (
              <span>
                Are you sure you want to delete the empty team{" "}
                <strong className="font-bold text-[#302630]">
                  {deleteTarget.team.name}
                </strong>
                ?
              </span>
            )
          }
          confirmLabel={isPending ? "Deleting..." : "Delete"}
          destructive
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {/* Restore Team Confirmation Dialog */}
      {restoreTarget && (
        <ConfirmDialog
          open={restoreTarget !== null}
          title="Restore Team"
          description={
            <span>
              Restore <strong className="font-bold text-[#302630]">{restoreTarget.name}</strong>?
              This will reset its tab-switch warning count to zero and return the team to active quiz status.
            </span>
          }
          confirmLabel="Restore team"
          onCancel={() => setRestoreTarget(null)}
          onConfirm={executeRestore}
        />
      )}
    </div>

  );

}
