# Blueprint to Live

> **Learn. Build. Compete.**

An end-to-end event management platform for college technical competitions.

Blueprint to Live is a web platform built for a technical event organized by the Information Science and Engineering (ISE) department. It provides participant access, live quiz operations, team monitoring, score calculation, finalist selection, and competition workflows through one application.

> **Demo:** The demo deployment should use its own database and configuration, separate from the live event environment.

---

## Table of Contents

- [Features](#features)
- [Competition Rounds](#competition-rounds)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Authentication and Access Control](#authentication-and-access-control)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Demo Access](#demo-access)
- [Demo and Production Deployment](#demo-and-production-deployment)
- [Security Checklist](#security-checklist)
- [Development Workflow](#development-workflow)
- [Acknowledgements](#acknowledgements)

---

## Features

### Participant Portal

- Google OAuth sign-in for registered participants.
- Server-side checks to restrict access to registered participants.
- Team-based participation workflows.
- Access to quiz and competition features.
- Leaderboard for competition rankings.
- Protected routes and API operations.

### Admin Console

- Team and participant management.
- Quiz question management.
- Quiz control: start, pause, resume, skip, and end.
- Live team and quiz monitoring.
- Quiz settings and configuration.
- Round 2 marks entry and score calculation.
- Finalist selection and management.
- Round 3 problem statement and submission workflows.

---

## Competition Rounds

### Round 1 — Warm-Up Rally

A live, synchronized online quiz to test participants' technical knowledge.

- Multiple-choice and coding questions.
- Configurable question timing.
- Administrator-controlled quiz operations.
- Team-based scoring and leaderboard ranking.
- Participation monitoring and results.

### Round 2 — Bug Bounty

A paper-based assessment round supported by an administrative marks-entry interface.

- Admin-managed team marks.
- Validation and autosaving.
- Combined Round 1 and Round 2 scoring.
- Configurable scoring weights.
- Ranking and finalist selection.

> Default planned scoring weights are **40%** for Round 1 and **60%** for Round 2. The finalist count is configurable.

### Round 3 — Final Build-Off

A practical development challenge where finalist teams select a problem statement and build a solution.

- Problem statement management.
- Team challenge selection.
- Submission workflows.
- Team deliverable tracking.

---

## Technology Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Authentication | Better Auth |
| Social sign-in | Google OAuth |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Database hosting | Supabase |
| PostgreSQL adapter | Prisma PostgreSQL adapter |
| Client-side data management | TanStack Query |
| Package manager | Bun |
| Deployment target | Vercel |

---

## Architecture Overview

The application uses the Next.js App Router with server-side data access and protected routes.

- **UI layer:** React components and Tailwind CSS.
- **Application layer:** Next.js pages, layouts, and API routes.
- **Authentication:** Better Auth manages authentication and sessions.
- **Authorization:** Server-side helpers enforce participant and administrator access.
- **Database:** PostgreSQL stores participant, team, quiz, scoring, and event data.
- **ORM:** Prisma manages the database schema and data access.

---

## Authentication and Access Control

- Google sign-in is intended for registered participants and authorized administrator accounts.
- Administrator access is controlled by the `ADMIN_EMAILS` allowlist.
- Protected admin routes use server-side authorization checks.
- A user cannot gain admin access merely by navigating directly to an admin URL.
- Email addresses are normalized during access checks.
- Demo deployments can enable a separate email/password login flow using `DEMO_MODE=true`.

> **Important:** Keep server-side authorization checks enabled in every environment. The visibility of a button or page is not an access-control mechanism.

---

## Project Structure

High-level overview of the main directories:

```text
blueprint-proj/
├── app/
│   ├── admin/
│   │   ├── teams/
│   │   ├── questions/
│   │   ├── quiz/
│   │   ├── settings/
│   │   ├── monitor/
│   │   ├── results/
│   │   ├── round-2/
│   │   └── round-3/
│   ├── api/
│   │   └── admin/
│   ├── demo-login/
│   ├── leaderboard/
│   ├── not-registered/
│   ├── play/
│   └── round3-entry/
├── components/
├── lib/
│   ├── auth.ts
│   ├── auth-client.ts
│   ├── auth-helper.ts
│   └── db.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
├── public/
├── next.config.ts
├── package.json
└── README.md
```

> This is an overview rather than an exhaustive listing; actual files may vary by branch.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- Node.js compatible with the installed Next.js version
- A PostgreSQL database, such as Supabase
- Google Cloud OAuth credentials if using Google sign-in

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd blueprint-proj
```

Replace `<YOUR_REPOSITORY_URL>` with your repository URL.

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

Create a local `.env` file. Use values from your own database and authentication configuration.

```env
# Database
DATABASE_URL=
DIRECT_URL=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Comma-separated administrator email allowlist
ADMIN_EMAILS=

# Optional project-specific test configuration, if used
TEST_EMAILS=

# Demo behavior: true or false
DEMO_MODE=false
```

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by the application |
| `DIRECT_URL` | Direct PostgreSQL connection string where required by the configured Prisma setup |
| `BETTER_AUTH_SECRET` | Secret used by Better Auth |
| `BETTER_AUTH_URL` | Base URL of the application |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ADMIN_EMAILS` | Comma-separated list of administrator email addresses |
| `TEST_EMAILS` | Optional test configuration, if referenced by project code or scripts |
| `DEMO_MODE` | Enables demo-specific behavior when set to `true` |

> **Warning:** Never commit `.env`, `.env.demo`, database credentials, OAuth secrets, or authentication secrets to source control. Do not expose secret values in client-side code.

### 4. Configure Google OAuth

In Google Cloud Console:

1. Select or create a Google Cloud project.
2. Configure the OAuth consent screen.
3. Create OAuth credentials for a web application.
4. Add the correct development and deployment origins.
5. Add the callback URL required by the installed Better Auth configuration.
6. Set the credentials in the corresponding environment.

Use the correct URLs for each environment. Development, production, and demo deployments may require separate OAuth configuration.

### 5. Generate Prisma Client

```bash
bunx prisma generate
```

Make sure the configured database is reachable before running database operations.

### 6. Apply database migrations

For a database that should receive the committed migrations:

```bash
bunx prisma migrate deploy
```

Review the project's existing migration history and verify that the database URL targets the intended database before running this command. **Do not reset a database containing event data.**

### 7. Start the development server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 8. Build and run for production

```bash
bun run build
bun run start
```

Use the scripts defined in `package.json` if they differ from these commands.

---

## Demo Access

The demo instance is intended to let reviewers explore the admin experience without touching live event data.

| Field | Value |
| --- | --- |
| Demo login page | `/demo-login` on the demo deployment |
| Demo email | `test@demo.com` |
| Demo password |`demotest123@` |
| Demo mode | `DEMO_MODE=true` |

The demo password was configured privately and is not available in this README's source context, so it is intentionally not guessed here. Before publishing, replace the password note with the correct demo password, or share the credentials through a private channel instead of publishing them publicly.

> **Important:** Only publish a demo password if the account is disposable and the demo environment is isolated from production. Never reuse production administrator credentials for a public demo.

---

## Demo and Production Deployment

The recommended deployment model uses separate instances:

### Production

- Live event database.
- Production application URL.
- Production Better Auth secret and OAuth configuration.
- Actual authorized administrators in `ADMIN_EMAILS`.
- `DEMO_MODE` unset or set to `false`.

### Demo

- Separate demo database.
- Demo application URL.
- Separate Better Auth secret and OAuth configuration as needed.
- Demo-only administrator account.
- `DEMO_MODE=true`.

Keep database URLs, secrets, OAuth settings, and administrator allowlists separate between environments. Verify that the demo deployment cannot write to the live event database.

---

## Security Checklist

- [ ] Keep `requireAdmin()` and other server-side authorization checks in place.
- [ ] Authorize every protected API operation on the server.
- [ ] Keep `.env` and `.env.demo` out of Git.
- [ ] Do not expose secrets through `NEXT_PUBLIC_*` variables.
- [ ] Use HTTPS for deployed authentication flows.
- [ ] Use separate databases for demo and production.
- [ ] Apply reviewed migrations rather than resetting production data.
- [ ] Avoid using personal or production administrator accounts as public demo credentials.
- [ ] Rotate any demo credentials that become publicly exposed.

---

## Development Workflow

Before changing the project:

1. Inspect the affected page, component, API route, and database model.
2. Preserve existing participant and administrator authorization rules.
3. Review database changes against the Prisma schema and migrations.
4. Run the build after significant changes.
5. Test protected routes as both an administrator and a participant.
6. Verify demo changes cannot affect production data.

---

## Acknowledgements

Built for **Blueprint to Live**, a technical event organized by the Information Science and Engineering department.

**Blueprint to Live — Learn. Build. Compete.**