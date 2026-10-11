
// "use client";
// import { useMemo, useState, useTransition } from "react";
// import { useRouter } from "next/navigation";
// import { deleteEmptyTeam } from "./teams-actions";
// import {
//   deleteParticipant,
//   updateParticipant,
//   type UpdateParticipantInput,
// } from "./participant-actions";



// type Member = {
//   id: string;
//   name: string;
//   email: string;
//   usn: string | null;
//   phone: string | null;
//   semester: string | null;
//   branch: string | null;
// };

// type Team = {
//   id: string;
//   name: string;
//   members: Member[];
// };

// type EditForm = {
//   participantId: string;
//   name: string;
//   email: string;
//   usn: string;
//   phone: string;
//   semester: string;
//   branch: string;
//   teamId: string;
//   overrideTeamLimit: boolean;
// };

// const inputClass =
//   "mt-1 w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-400";

// export default function TeamsTable({
//   initialTeams,
// }: {
//   initialTeams: Team[];
// }) {
//   const router = useRouter();
//   const [teams, setTeams] = useState(initialTeams);
  
//   const [search, setSearch] = useState("");
//   const [message, setMessage] = useState("");
//   const [isPending, startTransition] = useTransition();
//   const [editing, setEditing] = useState<EditForm | null>(null);

//   const filteredTeams = useMemo(() => {
//     const query = search.trim().toLowerCase();

//     if (!query) return teams;

//     return teams.filter((team) => {
//       return (
//         team.name.toLowerCase().includes(query) ||
//         team.members.some(
//           (member) =>
//             member.name.toLowerCase().includes(query) ||
//             member.email.toLowerCase().includes(query) ||
//             (member.usn ?? "").toLowerCase().includes(query),
//         )
//       );
//     });
//   }, [teams, search]);

//   const targetTeam = editing
//     ? teams.find((team) => team.id === editing.teamId)
//     : undefined;

//   const originalTeam = editing
//     ? teams.find((team) =>
//         team.members.some((member) => member.id === editing.participantId),
//       )
//     : undefined;

//   const exceedsLimit =
//     !!editing &&
//     !!targetTeam &&
//     targetTeam.id !== originalTeam?.id &&
//     targetTeam.members.length + 1 > 3;

//   function handleDeleteTeam(team: Team) {
//     if (team.members.length !== 0 || isPending) return;

//     if (!window.confirm(`Delete empty team "${team.name}"?`)) return;

//     setMessage("");

//     startTransition(async () => {
//       const result = await deleteEmptyTeam(team.id);

//       if (!result.success) {
//         setMessage(result.error);
//         return;
//       }

//       setTeams((current) =>
//         current.filter((item) => item.id !== team.id),
//       );
//       setMessage(`Deleted ${team.name}.`);
//     });
//   }

//   function openEdit(team: Team, member: Member) {
//     setMessage("");
//     setEditing({
//       participantId: member.id,
//       name: member.name,
//       email: member.email,
//       usn: member.usn ?? "",
//       phone: member.phone ?? "",
//       semester: member.semester ?? "",
//       branch: member.branch ?? "",
//       teamId: team.id,
//       overrideTeamLimit: false,
//     });
//   }

//   function updateField(field: keyof EditForm, value: string | boolean) {
//     setEditing((current) =>
//       current ? { ...current, [field]: value } : current,
//     );
//   }

//   function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
//     event.preventDefault();
//     if (!editing) return;

//     setMessage("");

//     const input: UpdateParticipantInput = {
//       ...editing,
//       name: editing.name.trim(),
//       email: editing.email.trim().toLowerCase(),
//       usn: editing.usn.trim(),
//       phone: editing.phone.trim(),
//       semester: editing.semester.trim(),
//       branch: editing.branch.trim(),
//     };

//     startTransition(async () => {
//       const result = await updateParticipant(input);

//       if (!result.success) {
//         setMessage(result.message);
//         return;
//       }

//       setEditing(null);
//       setMessage(result.message);
//       router.refresh();
//     });
//   }

//   function handleDeleteParticipant(member: Member) {
//     if (isPending) return;

//     if (
//       !window.confirm(
//         `Delete participant "${member.name}" (${member.email})? This cannot be undone.`,
//       )
//     ) {
//       return;
//     }

//     setMessage("");

//     startTransition(async () => {
//       const result = await deleteParticipant(member.id);

//       if (!result.success) {
//         setMessage(result.message);
//         return;
//       }

//       setTeams((current) =>
//         current.map((team) => ({
//           ...team,
//           members: team.members.filter(
//             (item) => item.id !== member.id,
//           ),
//         })),
//       );

//       setMessage(result.message);
//       router.refresh();
//     });
//   }

//   return (
//     <div className="space-y-4">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <input
//           value={search}
//           onChange={(event) => setSearch(event.target.value)}
//           placeholder="Search teams, names, emails, or USNs..."
//           aria-label="Search teams and participants"
//           className="w-full rounded-lg border border-white/15 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-violet-400 sm:max-w-md"
//         />

//         <p className="text-sm text-zinc-400">
//           {filteredTeams.length} of {teams.length} teams
//         </p>
//       </div>

//       {message && (
//         <p role="status" className="text-sm text-zinc-300">
//           {message}
//         </p>
//       )}

//       <div className="overflow-x-auto rounded-xl border border-white/10">
//         <table className="w-full min-w-[850px] border-collapse text-left text-sm">
//           <thead className="bg-zinc-900 text-zinc-400">
//             <tr>
//               <th className="px-4 py-3 font-medium">Team</th>
//               <th className="px-4 py-3 font-medium">Members</th>
//               <th className="px-4 py-3 font-medium">Member count</th>
//               <th className="px-4 py-3 font-medium">Team action</th>
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-white/10">
//             {filteredTeams.map((team) => (
//               <tr key={team.id} className="align-top hover:bg-white/[0.02]">
//                 <td className="px-4 py-4 font-medium">{team.name}</td>

//                 <td className="px-4 py-4">
//                   {team.members.length === 0 ? (
//                     <span className="text-zinc-500">No members</span>
//                   ) : (
//                     <ul className="space-y-5">
//                       {team.members.map((member) => (
//                         <li key={member.id}>
//                           <p className="font-medium text-zinc-200">
//                             {member.name}
//                           </p>
//                           <p className="mt-1 text-zinc-400">{member.email}</p>

//                           {(member.usn ||
//                             member.phone ||
//                             member.semester ||
//                             member.branch) && (
//                             <p className="mt-1 text-xs text-zinc-500">
//                               {[
//                                 member.usn,
//                                 member.phone,
//                                 member.semester
//                                   ? `${member.semester}th semester`
//                                   : null,
//                                 member.branch,
//                                 member.phone,
//                               ]
//                                 .filter(Boolean)
//                                 .filter(
//                                   (value, index, values) =>
//                                     values.indexOf(value) === index,
//                                 )
//                                 .join(" · ")}
//                             </p>
//                           )}

//                           <div className="mt-2 flex flex-wrap gap-2">
//                             <button
//                               type="button"
//                               disabled={isPending}
//                               onClick={() => openEdit(team, member)}
//                               className="rounded-md border border-violet-400/30 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-400/10 disabled:opacity-50"
//                             >
//                               Edit / Move
//                             </button>

//                             <button
//                               type="button"
//                               disabled={isPending}
//                               onClick={() => handleDeleteParticipant(member)}
//                               className="rounded-md border border-red-400/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-50"
//                             >
//                               Delete participant
//                             </button>
//                           </div>
//                         </li>
//                       ))}
//                     </ul>
//                   )}
//                 </td>

//                 <td className="px-4 py-4">
//                   <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">
//                     {team.members.length}
//                   </span>
//                 </td>

//                 <td className="px-4 py-4">
//                   <button
//                     type="button"
//                     disabled={team.members.length !== 0 || isPending}
//                     onClick={() => handleDeleteTeam(team)}
//                     className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-30"
//                     title={
//                       team.members.length
//                         ? "Only empty teams can be deleted"
//                         : "Delete empty team"
//                     }
//                   >
//                     Delete empty team
//                   </button>
//                 </td>
//               </tr>
//             ))}

//             {filteredTeams.length === 0 && (
//               <tr>
//                 <td colSpan={4} className="px-4 py-10 text-center text-zinc-400">
//                   No matching teams found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//       {editing && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
//           <form
//             onSubmit={handleUpdate}
//             className="my-auto max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
//           >
//             <div className="flex items-start justify-between gap-4">
//               <div>
//                 <h2 className="text-xl font-bold">Edit participant</h2>
//                 <p className="mt-1 text-sm text-zinc-400">
//                   Update details or move this member to another team.
//                 </p>
//               </div>

//               <button
//                 type="button"
//                 onClick={() => setEditing(null)}
//                 className="rounded-md px-3 py-1 text-zinc-400 hover:bg-white/10 hover:text-white"
//                 aria-label="Close edit form"
//               >
//                 ✕
//               </button>
//             </div>

//             <div className="grid gap-4 sm:grid-cols-2">
//               <label className="text-sm text-zinc-300">
//                 Full name *
//                 <input
//                   className={inputClass}
//                   value={editing.name}
//                   onChange={(event) => updateField("name", event.target.value)}
//                   required
//                 />
//               </label>

//               <label className="text-sm text-zinc-300">
//                 Gmail address *
//                 <input
//                   className={inputClass}
//                   type="email"
//                   pattern="[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com"
//                   title="Enter an email address ending in @gmail.com"
//                   value={editing.email}
//                   onChange={(event) => updateField("email", event.target.value)}
//                   required
//                 />
//               </label>

//               <label className="text-sm text-zinc-300">
//                 USN
//                 <input
//                   className={inputClass}
//                   value={editing.usn}
//                   onChange={(event) => updateField("usn", event.target.value)}
//                 />
//               </label>

//               <label className="text-sm text-zinc-300">
//                 Phone
//                 <input
//                   className={inputClass}
//                   type="tel"
//                   value={editing.phone}
//                   onChange={(event) => updateField("phone", event.target.value)}
//                 />
//               </label>

//               <label className="text-sm text-zinc-300">
//                 Semester
//                 <select
//                   className={inputClass}
//                   value={editing.semester}
//                   onChange={(event) =>
//                     updateField("semester", event.target.value)
//                   }
//                 >
//                   <option value="">Select semester</option>
//                   {[3, 4, 5, 6, 7].map((semester) => (
//                     <option key={semester} value={String(semester)}>
//                       {semester}th semester
//                     </option>
//                   ))}
//                 </select>
//               </label>

//               <label className="text-sm text-zinc-300">
//                 Branch
//                 <input
//                   className={inputClass}
//                   value={editing.branch}
//                   onChange={(event) => updateField("branch", event.target.value)}
//                 />
//               </label>
//             </div>

//             <label className="block text-sm text-zinc-300">
//               Team *
//               <select
//                 className={inputClass}
//                 value={editing.teamId}
//                 onChange={(event) => {
//                   setEditing((current) =>
//                     current
//                       ? {
//                           ...current,
//                           teamId: event.target.value,
//                           overrideTeamLimit: false,
//                         }
//                       : current,
//                   );
//                 }}
//                 required
//               >
//                 {teams.map((team) => (
//                   <option key={team.id} value={team.id}>
//                     {team.name} ({team.members.length} members)
//                   </option>
//                 ))}
//               </select>
//             </label>

//             {exceedsLimit && (
//               <label className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
//                 <input
//                   type="checkbox"
//                   className="mt-1 accent-violet-400"
//                   checked={editing.overrideTeamLimit}
//                   onChange={(event) =>
//                     updateField("overrideTeamLimit", event.target.checked)
//                   }
//                 />
//                 Allow the destination team to exceed 3 members.
//               </label>
//             )}

//             <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
//               <button
//                 type="submit"
//                 disabled={isPending}
//                 className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
//               >
//                 {isPending ? "Saving..." : "Save changes"}
//               </button>

//               <button
//                 type="button"
//                 onClick={() => setEditing(null)}
//                 disabled={isPending}
//                 className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10"
//               >
//                 Cancel
//               </button>
//             </div>
//           </form>
//         </div>
//       )}
//     </div>
//   );
// }





"use client";

import { useMemo, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { deleteEmptyTeam } from "./teams-actions";

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

  "mt-1 w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-400";

export default function TeamsTable({

initialTeams,

}: {

  initialTeams: Team[];

}) {

  const router = useRouter();

  const [teams, setTeams] = useState(initialTeams);

  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");

  const [isPending, startTransition] = useTransition();

  const [editing, setEditing] = useState<EditForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const filteredTeams = useMemo(() => {

    const query = search.trim().toLowerCase();

    if (!query) return teams;

    return teams.filter((team) => {

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

  }, [teams, search]);

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

className="w-full rounded-lg border border-white/15 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-violet-400 sm:max-w-md"

        />

        <p className="text-sm text-zinc-400">

          {filteredTeams.length} of {teams.length} teams

        </p>

      </div>

      {message && (

        <p role="status" className="text-sm text-zinc-300">

          {message}

        </p>

      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">

        <table className="w-full min-w-[850px] border-collapse text-left text-sm">

          <thead className="bg-zinc-900 text-zinc-400">

            <tr>

              <th className="px-4 py-3 font-medium">Team</th>

              <th className="px-4 py-3 font-medium">Members</th>

              <th className="px-4 py-3 font-medium">Member count</th>

              <th className="px-4 py-3 font-medium">Team action</th>

            </tr>

          </thead>

          <tbody className="divide-y divide-white/10">

            {filteredTeams.map((team) => (

              <tr key={team.id} className="align-top hover:bg-white/[0.02]">

                <td className="px-4 py-4 font-medium">{team.name}</td>

                <td className="px-4 py-4">

                  {team.members.length === 0 ? (

                    <span className="text-zinc-500">No members</span>

                  ) : (

                    <ul className="space-y-5">

                      {team.members.map((member) => (

                        <li key={member.id}>

                          <p className="font-medium text-zinc-200">

                            {member.name}

                          </p>

                          <p className="mt-1 text-zinc-400">{member.email}</p>

                          {(member.usn ||

member.phone ||

member.semester ||

member.branch) && (

                            <p className="mt-1 text-xs text-zinc-500">

                              {[

member.usn,

member.phone,

member.semester

                                  ? `${member.semester}th semester`

                                  : null,

member.branch,

member.phone,

                              ]

                                .filter(Boolean)

                                .filter(

                                  (value, index, values) =>

values.indexOf(value) === index,

                                )

                                .join(" · ")}

                            </p>

                          )}

                          <div className="mt-2 flex flex-wrap gap-2">

                            <button

type="button"

disabled={isPending}

onClick={() => openEdit(team, member)}

className="rounded-md border border-violet-400/30 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-400/10 disabled:opacity-50"

                            >

                              Edit / Move

                            </button>

                            <button

type="button"

disabled={isPending}

onClick={() => handleDeleteParticipant(member)}

className="rounded-md border border-red-400/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-400/10 disabled:opacity-50"

                            >

                              Delete participant

                            </button>

                          </div>

                        </li>

                      ))}

                    </ul>

                  )}

                </td>

                <td className="px-4 py-4">

                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">

                    {team.members.length}

                  </span>

                </td>

                <td className="px-4 py-4">

                  <button

type="button"

disabled={team.members.length !== 0 || isPending}

onClick={() => handleDeleteTeam(team)}

className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-30"

title={

team.members.length

                        ? "Only empty teams can be deleted"

                        : "Delete empty team"

                    }

                  >

                    Delete empty team

                  </button>

                </td>

              </tr>

            ))}

            {filteredTeams.length === 0 && (

              <tr>

                <td colSpan={4} className="px-4 py-10 text-center text-zinc-400">

                  No matching teams found.

                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

      {editing && (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">

          <form

onSubmit={handleUpdate}

className="my-auto max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"

          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h2 className="text-xl font-bold">Edit participant</h2>

                <p className="mt-1 text-sm text-zinc-400">

                  Update details or move this member to another team.

                </p>

              </div>

              <button

type="button"

onClick={() => setEditing(null)}

className="rounded-md px-3 py-1 text-zinc-400 hover:bg-white/10 hover:text-white"

aria-label="Close edit form"

              >

                ✕

              </button>

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <label className="text-sm text-zinc-300">

                Full name \*

                <input

className={inputClass}

value={editing.name}

onChange={(event) => updateField("name", event.target.value)}

required

                />

              </label>

              <label className="text-sm text-zinc-300">

                Gmail address \*

                <input

className={inputClass}

type="email"

pattern="[a-zA-Z0-9.!#$%&'\*+/=?^\_`{|}\~-]+\@gmail\.com"

title="Enter an email address ending in @gmail.com"

value={editing.email}

onChange={(event) => updateField("email", event.target.value)}

required

                />

              </label>

              <label className="text-sm text-zinc-300">

                USN

                <input

className={inputClass}

value={editing.usn}

onChange={(event) => updateField("usn", event.target.value)}

                />

              </label>

              <label className="text-sm text-zinc-300">

                Phone

                <input

className={inputClass}

type="tel"

value={editing.phone}

onChange={(event) => updateField("phone", event.target.value)}

                />

              </label>

              <label className="text-sm text-zinc-300">

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

              <label className="text-sm text-zinc-300">

                Branch

                <input

className={inputClass}

value={editing.branch}

onChange={(event) => updateField("branch", event.target.value)}

                />

              </label>

            </div>

            <label className="block text-sm text-zinc-300">

              Team \*

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

              <label className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">

                <input

type="checkbox"

className="mt-1 accent-violet-400"

checked={editing.overrideTeamLimit}

onChange={(event) =>

                    updateField("overrideTeamLimit", event.target.checked)

                  }

                />

                Allow the destination team to exceed 3 members.

              </label>

            )}

            <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">

              <button

type="submit"

disabled={isPending}

className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"

              >

                {isPending ? "Saving..." : "Save changes"}

              </button>

              <button

type="button"

onClick={() => setEditing(null)}

disabled={isPending}

className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10"

              >

                Cancel

              </button>

            </div>

          </form>

        </div>

      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isPending) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10 text-xl text-red-400">
              !
            </div>

            <h2 id="delete-title" className="text-lg font-semibold text-white">
              {deleteTarget.type === "participant"
                ? "Delete participant?"
                : "Delete empty team?"}
            </h2>

            <p
              id="delete-description"
              className="mt-2 text-sm leading-6 text-zinc-400"
            >
              {deleteTarget.type === "participant" ? (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-white">
                    {deleteTarget.member.name}
                  </span>{" "}
                  ({deleteTarget.member.email})? This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete the empty team{" "}
                  <span className="font-medium text-white">
                    {deleteTarget.team.name}
                  </span>
                  ?
                </>
              )}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

  );

}
