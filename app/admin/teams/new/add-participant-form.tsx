
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createTeamParticipants,
  type CreateTeamParticipantsInput,
} from "../participant-actions";

type TeamOption = {
  id: string;
  name: string;
  _count: { participants: number };
};

type MemberForm = {
  name: string;
  email: string;
  usn: string;
  phone: string;
  semester: string;
  branch: string;
};

const emptyMember = (): MemberForm => ({
  name: "",
  email: "",
  usn: "",
  phone: "",
  semester: "",
  branch: "ISE",
});

const inputClass =
  "mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-400";

const labelClass = "text-sm font-medium text-zinc-200";

export default function AddParticipantForm({
  teams,
}: {
  teams: TeamOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [teamMode, setTeamMode] = useState<"existing" | "new">(
    teams.length > 0 ? "existing" : "new",
  );
  const [members, setMembers] = useState<MemberForm[]>([
    emptyMember(),
    emptyMember(),
  ]);
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [newTeamName, setNewTeamName] = useState("");
  const [overrideTeamLimit, setOverrideTeamLimit] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const selectedTeam = teams.find((team) => team.id === teamId);
  const exceedsLimit =
    teamMode === "existing" &&
    !!selectedTeam &&
    selectedTeam._count.participants + members.length > 3;

  function updateMember(
    index: number,
    field: keyof MemberForm,
    value: string,
  ) {
    setMembers((current) =>
      current.map((member, i) =>
        i === index ? { ...member, [field]: value } : member,
      ),
    );
  }

  function addMember() {
    if (members.length < 3) {
      setMembers((current) => [...current, emptyMember()]);
    }
  }

  function removeMember(index: number) {
    if (members.length > 2) {
      setMembers((current) => current.filter((_, i) => i !== index));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    const input: CreateTeamParticipantsInput = {
      members: members.map((member) => ({
        ...member,
        name: member.name.trim(),
        email: member.email.trim().toLowerCase(),
        usn: member.usn.trim(),
        phone: member.phone.trim(),
        semester: member.semester,
        branch: member.branch.trim(),
      })),
      teamId: teamMode === "existing" ? teamId : undefined,
      newTeamName:
        teamMode === "new" ? newTeamName.trim() : undefined,
      overrideTeamLimit,
    };

    startTransition(async () => {
      const result = await createTeamParticipants(input);
      setMessage(result.message);
      setSuccess(result.success);

      if (result.success) {
        router.push("/admin/teams");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Team members</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Enter details for 2 or 3 members in one submission.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm">
          {members.length}/3
        </span>
      </div>

      {members.map((member, index) => (
        <section
          key={index}
          className="rounded-xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold">Member {index + 1}</h3>

            {members.length > 2 && (
              <button
                type="button"
                onClick={() => removeMember(index)}
                className="text-sm text-red-300 hover:text-red-200"
              >
                Remove member
              </button>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Full name *
              <input
                className={inputClass}
                value={member.name}
                onChange={(event) =>
                  updateMember(index, "name", event.target.value)
                }
                placeholder="Full name"
                autoComplete="off"
                required
              />
            </label>

            <label className={labelClass}>
              Gmail address *
              <input
                className={inputClass}
                type="email"
                pattern="[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com"
                title="Enter an email address ending in @gmail.com"
                value={member.email}
                onChange={(event) =>
                  updateMember(index, "email", event.target.value)
                }
                placeholder="student@gmail.com"
                autoComplete="off"
                required
              />
            </label>

            <label className={labelClass}>
              USN
              <input
                className={inputClass}
                value={member.usn}
                onChange={(event) =>
                  updateMember(index, "usn", event.target.value)
                }
                placeholder="College USN"
              />
            </label>

            <label className={labelClass}>
              Phone
              <input
                className={inputClass}
                type="tel"
                value={member.phone}
                onChange={(event) =>
                  updateMember(index, "phone", event.target.value)
                }
                placeholder="Phone number"
                autoComplete="off"
              />
            </label>

            <label className={labelClass}>
              Semester
              <select
                className={inputClass}
                value={member.semester}
                onChange={(event) =>
                  updateMember(index, "semester", event.target.value)
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

            <label className={labelClass}>
              Branch
              <input
                className={inputClass}
                value={member.branch}
                onChange={(event) =>
                  updateMember(index, "branch", event.target.value)
                }
                placeholder="e.g. ISE"
              />
            </label>
          </div>
        </section>
      ))}

      {members.length < 3 && (
        <button
          type="button"
          onClick={addMember}
          className="rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm text-zinc-300 hover:border-violet-400 hover:text-white"
        >
          + Add another member
        </button>
      )}

      <div className="border-t border-white/10 pt-6">
        <h2 className="text-lg font-semibold">Team assignment</h2>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setTeamMode("existing");
              setOverrideTeamLimit(false);
            }}
            className={`rounded-lg border px-4 py-2 text-sm ${
              teamMode === "existing"
                ? "border-violet-400 bg-violet-400/10 text-white"
                : "border-white/10 text-zinc-400"
            }`}
          >
            Existing team
          </button>

          <button
            type="button"
            onClick={() => {
              setTeamMode("new");
              setOverrideTeamLimit(false);
            }}
            className={`rounded-lg border px-4 py-2 text-sm ${
              teamMode === "new"
                ? "border-violet-400 bg-violet-400/10 text-white"
                : "border-white/10 text-zinc-400"
            }`}
          >
            Create new team
          </button>
        </div>

        {teamMode === "existing" ? (
          <label className={`${labelClass} mt-4 block`}>
            Select team *
            <select
              className={inputClass}
              value={teamId}
              onChange={(event) => {
                setTeamId(event.target.value);
                setOverrideTeamLimit(false);
              }}
              required
            >
              <option value="">Choose a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team._count.participants} members)
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className={`${labelClass} mt-4 block`}>
            New team name *
            <input
              className={inputClass}
              value={newTeamName}
              onChange={(event) => setNewTeamName(event.target.value)}
              placeholder="Enter a unique team name"
              required
            />
          </label>
        )}

        {exceedsLimit && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200">
              This team has {selectedTeam?._count.participants} existing
              members. Adding {members.length} more would exceed the
              three-member limit.
            </p>

            <label className="mt-3 flex items-start gap-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                className="mt-1 accent-violet-400"
                checked={overrideTeamLimit}
                onChange={(event) =>
                  setOverrideTeamLimit(event.target.checked)
                }
              />
              Allow this team to exceed the three-member limit.
            </label>
          </div>
        )}
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-lg border p-3 text-sm ${
            success
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Registering team..."
            : `Register team (${members.length} members)`}
        </button>

        <Link
          href="/admin/teams"
          className="rounded-lg border border-white/15 px-5 py-2.5 text-sm text-zinc-300 hover:bg-white/10"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}