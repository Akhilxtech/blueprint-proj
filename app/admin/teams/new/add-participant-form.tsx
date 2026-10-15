
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
  "mt-2 w-full rounded-xl border border-[#E7DCE4] bg-white/90 px-3.5 py-2.5 text-sm text-[#302630] outline-none placeholder:text-[#4E404C]/60 focus:border-[#D9468D] focus:ring-2 focus:ring-[#D9468D]/20 transition-all";

const labelClass = "text-xs font-bold uppercase tracking-wider text-[#4E404C]";

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
          <h2 className="text-base font-bold text-[#302630]">Team members</h2>
          <p className="mt-0.5 text-xs text-[#4E404C]">
            Enter details for 2 or 3 members in one submission.
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-[#D9468D]/20 bg-[#FCE7F1] px-3 py-1 text-xs font-bold text-[#BE3477]">
          {members.length}/3 members
        </span>
      </div>

      {members.map((member, index) => (
        <section
          key={index}
          className="rounded-2xl border border-white/80 bg-white/60 p-4 shadow-xs backdrop-blur-xs sm:p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#302630]">Member {index + 1}</h3>

            {members.length > 2 && (
              <button
                type="button"
                onClick={() => removeMember(index)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline transition-colors"
              >
                Remove member
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
          className="w-full rounded-xl border border-dashed border-[#D9468D]/40 bg-white/40 px-4 py-2.5 text-xs font-bold text-[#BE3477] hover:border-[#D9468D] hover:bg-[#FCE7F1]/50 transition-colors"
        >
          + Add another member
        </button>
      )}

      <div className="border-t border-[#E7DCE4] pt-5">
        <h2 className="text-base font-bold text-[#302630]">Team assignment</h2>

        <div className="mt-3 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => {
              setTeamMode("existing");
              setOverrideTeamLimit(false);
            }}
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
              teamMode === "existing"
                ? "border-[#D9468D] bg-[#FCE7F1] text-[#BE3477] shadow-xs"
                : "border-[#E7DCE4] bg-white/60 text-[#4E404C] hover:text-[#302630] hover:bg-white"
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
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
              teamMode === "new"
                ? "border-[#D9468D] bg-[#FCE7F1] text-[#BE3477] shadow-xs"
                : "border-[#E7DCE4] bg-white/60 text-[#4E404C] hover:text-[#302630] hover:bg-white"
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
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-xs font-medium text-amber-900">
              This team has {selectedTeam?._count.participants} existing
              members. Adding {members.length} more would exceed the
              three-member limit.
            </p>

            <label className="mt-2.5 flex items-start gap-2.5 text-xs font-semibold text-amber-900">
              <input
                type="checkbox"
                className="mt-0.5 accent-[#BE3477]"
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
          className={`rounded-xl border p-3 text-xs font-semibold ${
            success
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-rose-300 bg-rose-50 text-rose-800"
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-[#E7DCE4] pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#BE3477] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Registering team..."
            : `Register team (${members.length} members)`}
        </button>

        <Link
          href="/admin/teams"
          className="rounded-xl border border-[#E7DCE4] bg-white/80 px-5 py-2.5 text-xs font-semibold text-[#4E404C] hover:bg-white hover:text-[#302630] transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}