# Timeclock

Timeclock is a live shift-command center for small restaurants and cafes.

It combines schedule building, employee PIN clock-in, shared station mode, live attendance, and timecard reports in one public web app. The goal is simple: help a manager see who was scheduled, who actually showed up, and what needs attention before payroll gets messy.

## Public Demo

Public URL: add final deployed URL here before submission.

### Demo-only production setup (Vercel fast path)

1. Set demo email in both backend and frontend env:

- Backend: `DEMO_ALLOWED_EMAIL=demo-user@example.com`
- Frontend: `VITE_DEMO_ALLOWED_EMAIL=demo-user@example.com`

2. Keep normal Convex auth keys as is, and ensure `VITE_CONVEX_URL` points to the deployed
Convex backend.

3. Seed (or reseed) demo data in Convex after deployment:

- `bun x convex run seed.ensureDemoData` (from `packages/backend`, with your deployed Convex env selected)

4. Deploy frontend on Vercel:

- Set Vercel **Root Directory** to `apps/web`.
- Add `VITE_CONVEX_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, and `VITE_DEMO_ALLOWED_EMAIL`.
- Build command: `bun run build`.
- Output directory: `dist`.

Fast demo path:

1. Open the manager dashboard.
2. Review today's attendance and exceptions.
3. Open the schedule to see weekly shifts, open shifts, and warnings.
4. Open the employee or station view.
5. Clock in with a seeded employee PIN.
6. Return to the manager dashboard and review the new punch.
7. Open reports to compare scheduled hours against actual worked hours.

## What We Built

- Manager dashboard for live attendance.
- Weekly schedule builder with publish flow.
- Employee PIN clock-in flow.
- Shared location station route.
- Multi-location seeded company data.
- Attendance states for late, early, no-show, and unscheduled punches.
- Reports for scheduled versus actual hours, breaks, edits, and exceptions.

## Built With Cursor

This was built for Cursor 4H as a beginner-friendly, shipped web app. Cursor helped us move from product scope to working implementation quickly: manager screens, employee flows, seeded backend data, UI polish, and demo-ready writeup.

## Next Steps

- Add payroll export.
- Add shift-trade and open-shift claiming flows.
- Add location-aware clock-in verification.
- Add manager approvals for corrected timecards.
- Add schedule templates and copy-previous-week.
