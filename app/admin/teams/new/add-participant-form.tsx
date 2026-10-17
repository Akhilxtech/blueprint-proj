
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
  "mt-2 w-full rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/90 dark:bg-[#171717] px-3.5 py-2.5 text-sm text-[#302630] dark:text-[#FAFAFA] outline-none placeholder:text-[#4E404C]/60 dark:placeholder-[#A3A3A3]/50 focus:border-[#D9468D] dark:focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#D9468D]/20 dark:focus:ring-[#8B5CF6]/20 transition-all";

const labelClass = "text-xs font-bold uppercase tracking-wider text-[#4E404C] dark:text-[#A3A3A3]";

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
          <h2 className="text-base font-bold text-[#302630] dark:text-[#FAFAFA]">Team members</h2>
          <p className="mt-0.5 text-xs text-[#4E404C] dark:text-[#A3A3A3]">
            Enter details for 2 or 3 members in one submission.
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-[#D9468D]/20 dark:border-[#8B5CF6]/30 bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 px-3 py-1 text-xs font-bold text-[#BE3477] dark:text-[#A78BFA]">
          {members.length}/3 members
        </span>
      </div>

      {members.map((member, index) => (
        <section
          key={index}
          className="rounded-2xl border border-white/80 dark:border-[#292929] bg-white/60 dark:bg-[#171717] p-4 shadow-xs backdrop-blur-xs sm:p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#302630] dark:text-[#FAFAFA]">Member {index + 1}</h3>

            {members.length > 2 && (
              <button
                type="button"
                onClick={() => removeMember(index)}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline transition-colors"
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
          className="w-full rounded-xl border border-dashed border-[#D9468D]/40 dark:border-[#8B5CF6]/40 bg-white/40 dark:bg-[#171717]/40 px-4 py-2.5 text-xs font-bold text-[#BE3477] dark:text-[#A78BFA] hover:border-[#D9468D] dark:hover:border-[#8B5CF6] hover:bg-[#FCE7F1]/50 dark:hover:bg-[#8B5CF6]/15 transition-colors"
        >
          + Add another member
        </button>
      )}

      <div className="border-t border-[#E7DCE4] dark:border-[#292929] pt-5">
        <h2 className="text-base font-bold text-[#302630] dark:text-[#FAFAFA]">Team assignment</h2>

        <div className="mt-3 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => {
              setTeamMode("existing");
              setOverrideTeamLimit(false);
            }}
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
              teamMode === "existing"
                ? "border-[#D9468D] dark:border-[#8B5CF6] bg-[#FCE7F1] dark:bg-[#8B5CF6]/20 text-[#BE3477] dark:text-[#A78BFA] shadow-xs"
                : "border-[#E7DCE4] dark:border-[#292929] bg-white/60 dark:bg-[#171717] text-[#4E404C] dark:text-[#D4D4D4] hover:text-[#302630] dark:hover:text-[#FAFAFA] hover:bg-white dark:hover:bg-[#202020]"
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
                ? "border-[#D9468D] dark:border-[#8B5CF6] bg-[#FCE7F1] dark:bg-[#8B5CF6]/20 text-[#BE3477] dark:text-[#A78BFA] shadow-xs"
                : "border-[#E7DCE4] dark:border-[#292929] bg-white/60 dark:bg-[#171717] text-[#4E404C] dark:text-[#D4D4D4] hover:text-[#302630] dark:hover:text-[#FAFAFA] hover:bg-white dark:hover:bg-[#202020]"
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
          <div className="mt-4 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-300">
              This team has {selectedTeam?._count.participants} existing
              members. Adding {members.length} more would exceed the
              three-member limit.
            </p>

            <label className="mt-2.5 flex items-start gap-2.5 text-xs font-semibold text-amber-900 dark:text-amber-300">
              <input
                type="checkbox"
                className="mt-0.5 accent-[#BE3477] dark:accent-[#8B5CF6]"
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
              ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
              : "border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300"
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-[#E7DCE4] dark:border-[#292929] pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] dark:hover:bg-[#7C3AED] active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Registering team..."
            : `Register team (${members.length} members)`}
        </button>

        <Link
          href="/admin/teams"
          className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] px-5 py-2.5 text-xs font-semibold text-[#4E404C] dark:text-[#D4D4D4] hover:bg-white dark:hover:bg-[#202020] hover:text-[#302630] dark:hover:text-[#FAFAFA] transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}