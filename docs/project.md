# PROJECT CONTEXT: Blueprint to Live

## Event
College tech event by the Information Science and Engineering (ISE) department, 24 Oct 2026, about 80 participants in about 30 teams of 2 to 3. Three rounds:
- Round 1 "Warm-Up Rally": live synchronized online quiz (about 20 MCQs). This app runs it.
- Round 2 "Bug Bounty": paper test. This app only has an admin grid to enter marks and compute the combined ranking.
- Round 3 "Final Build-Off": the 10 finalist teams choose 1 of 15 problem statements. This app runs the choosing logic and shows hints.

## Stack (already set up)
Next.js App Router + TypeScript + Tailwind + shadcn/ui (pink theme tokens in globals.css), Prisma 7 with @prisma/adapter-pg on Supabase Postgres. The Prisma client singleton is at src/lib/prisma.ts and generated types are imported from "@/generated/prisma/client". Existing models: Team, Participant. Better Auth with Google is added in phase 1. Deployed on Vercel later. Use npm.

## Conventions
1. All database access is server-side only. Never expose correct answers, future questions or other teams' data to participants.
2. Time is server-authoritative. Compute with Date.now() on the server only. The client shows remaining time using an offset (serverNow minus client time) returned by the state endpoint.
3. Emails are always trimmed and lowercased.
4. Admin = signed-in email is in the ADMIN_EMAILS env var (comma separated). Provide helpers requireAdmin() and requireParticipant() (returns participant and team). Participant = signed-in email exists in the Participant table.
5. No websockets and no Supabase Realtime. Clients poll a state endpoint every 2 seconds.
6. Validate every request body with zod. Return clear JSON errors.
7. After a schema change run: npx prisma migrate dev --name <name> and then npx prisma generate.
8. Use shadcn/ui components and the existing pink theme. Participant screens are mobile-friendly. Every status must have an icon and a text label, not color only.
9. Keep code simple and readable. Do NOT add features outside the current phase. Before coding, show a short plan. After coding, list the files you changed and how to test.
10. Follow the CURRENT official docs for Better Auth, Prisma 7 and Next.js when installing or configuring them.

## Domain rules

### Round 1 quiz
- One global synchronized clock. All teams see the same question at the same time. Nobody can skip, go back or move ahead. The question changes for everyone when its timer ends, even if everyone has answered.
- Each question has a duration. Resolution order: the question's own timeSeconds, then the default for its type (THEORY default 20 s, CODE default 90 s), then fallback 30 s. After each question there is a gap (default 3 s).
- When the admin presses Start, snapshot the included questions in order into QuizRunQuestion rows with durationMs and gapMs, so later edits do not change a running quiz. QuizRun stores: status (NOT_STARTED, RUNNING, PAUSED, ENDED), startedAt (the scheduled start time = now + prestart countdown, default 10 s), pausedAt, pausedMs, skipMs, endedAt.
- Clock: elapsed = (status PAUSED ? pausedAt : now) - startedAt - pausedMs + skipMs. If elapsed < 0 the phase is COUNTDOWN. Otherwise walk the slots: each slot is [question window of durationMs][gap of gapMs]. Phases are QUESTION, GAP, PAUSED (frozen) and ENDED (after the last slot or when the admin ends it). Skip = add the remaining time of the current slot to skipMs (jump to the next question's start). Resume = pausedMs += now - pausedAt.
- Answers: one chance per question. The first answer wins and is final. Unique constraint on (teamId, questionId). Insert with createMany and skipDuplicates and use the returned count to know if it was accepted. An answer is accepted only if: the participant's team is on the roster, the team is not eliminated, the phase is QUESTION for that exact question (or within graceMs, default 1500, after the question window), and the option belongs to the question. Store answeredAt and responseMs (elapsed time from the question's start).
- Verdict of the previous question: when question n+1 becomes current (or the quiz has ended), the state shows the team's result for question n: CORRECT, WRONG or NOT_ANSWERED. Never reveal the result of the current question or during the gap. After the last question, the final screen shows the last verdict.
- Roster: at Start, freeze a roster of teams that have accepted the rules and were seen in the waiting room in the last 30 seconds. After Start, no new team can join. Teams not on the roster see "The quiz has already started. New teams cannot join. You will continue to Round 2." and score 0. A roster team that disconnects can reload and returns to the current question.
- Scoring is computed when viewed (SQL), never stored. Score = sum of marks for correct answers. Round 1 % = score / total marks of the quiz questions x 100. Ranking: higher score, then lower total responseMs over correctly answered questions, then more questions where the team was the fastest correct responder, then flag the tie.

### Tab-switch policy (Round 1 only)
Leaving the quiz screen (tab or window switch, minimize) is a violation. One continuous away episode = one violation. Ignore episodes under 1 second and the first 5 seconds after page load or reconnect. Violations are counted on the SERVER (so refresh does not reset them), de-duplicated by clientEventId. 3 warnings (maxWarnings setting). The 3rd eliminates the team: its answers lock, it sees an Eliminated screen. Admin can restore a team (reset warnings to 0) and add or remove a single warning.

### Round 2
Teams are marked by hand on paper. Admin enters marks for 10 questions per team (0 to 10, partial marks allowed; sections A = Q1-4 dry runs, B = Q5-7 buggy code, C = Q8-10 architecture). Combined = Round 1 % x w1 + Round 2 % x w2 (defaults 0.4 and 0.6). Tie-break order: combined, Round 2 total, Round 1 score, Section C score, lower Round 1 correct-answer time, then flag for sudden death. Top N (default 10) become finalists.

### Round 3
Only finalist teams can enter. 15 problem statements. A team picks exactly one statement; the pick is final. Server rules: selection window must be open, statement enabled, team has no selection yet, optional per-statement cap not reached. Hints appear only after the team has selected that statement. Admin can reset a team's selection or assign one manually.



in my next message i reply you with betterauth+ prisma with supabase setup then i will paste phase 1 and we work on that