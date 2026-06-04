# Timeclock

Timeclock is a hackathon MVP for employee scheduling, location-based clock-in/out, live attendance, and timecard reporting for multi-location businesses such as coffee shops and restaurants.

The MVP is a single responsive web app with three product areas:

- Manager
- Employee
- Location Station

Native mobile apps, payroll integrations, GPS/geofencing, shift trades, notifications, schedule templates, payroll exports, and formal timecard approvals are deferred.

## Demo Goal

The product is optimized for a smooth scripted demo:

1. A manager logs in with prefilled credentials.
2. The manager opens next week's unpublished schedule for a selected location.
3. The manager creates or edits assigned and open shifts.
4. The schedule shows labor hour totals, position coverage, and warnings.
5. The manager publishes the schedule.
6. An employee logs in by PIN and sees the newly published schedule.
7. The employee clocks in from the employee web view or the Location Station.
8. The manager Today dashboard updates by polling.
9. The manager opens reports showing scheduled versus actual time.

## Product Areas

### Manager

Managers use a desktop/tablet-first interface with a shared active location selector.

Core manager screens:

- Today dashboard
- Schedule builder
- Employee management
- Location settings
- Timesheet reports

Admins can access all company locations. Managers can access only their assigned locations.

### Employee

Employees access the web app with a company-unique 4-digit PIN.

Employee capabilities:

- View published assigned shifts across assigned locations.
- View published open shifts as read-only.
- Clock in, start break, end break, and clock out.
- View today's timecard events and recent timecard history.

Employees cannot see draft or unpublished schedules. Employee correction requests, shift trades, and open-shift claiming are deferred.

### Location Station

The Location Station is a kiosk-style web route for shared workplace clock-in/out.

Flow:

1. A manager/admin unlocks station mode.
2. The manager selects a location.
3. The station hides normal navigation and shows a PIN pad.
4. An employee enters their PIN.
5. The app shows the employee name/photo and current status.
6. The employee clocks in, starts/ends break, or clocks out.

Station PIN lookup accepts only active employees assigned to the selected location. Exiting station mode requires manager/admin confirmation.

## Scheduling

Schedules are separate from actual timecards.

Rules:

- One schedule belongs to one location and one schedule week.
- The week start day is configured per location.
- Publishing is a simple visibility toggle for the MVP.
- Before publish, employees cannot see the schedule.
- After publish, employees can see it.
- Edits after publish are reflected immediately.
- Publishing records timestamps such as `published_at` and `updated_at`.

The primary schedule UI is a weekly grid:

- Rows: employees plus an Open Shifts row.
- Columns: days in the selected location's schedule week.
- Cells: one or more shift blocks.
- Shift create/edit happens in a modal.

Shifts:

- Can be assigned to one employee or left open.
- Must have a position.
- Can include optional planned unpaid break minutes.
- Can include notes.
- Can cross midnight and are shown on the start day with an overnight indicator.
- Can be duplicated individually.
- Can be edited or deleted after publish in the MVP.

Open shifts:

- Are visible to employees after publish.
- Are read-only for employees.
- Count toward schedule totals and position coverage.
- Do not count toward an individual employee's weekly hours.

Schedule builder should show:

- Weekly hours by employee.
- Daily total scheduled hours.
- Schedule total hours.
- Daily/weekly position coverage.
- Warnings for overlapping shifts, shifts outside location hours, high weekly hours, and remaining open shifts.

Warnings should not block publishing.

Deferred scheduling features:

- Shift trades.
- Employee availability/preferences.
- Schedule templates.
- Copy previous week.
- Drag-and-drop scheduling.
- Labor cost estimates.
- Employee schedule acknowledgements/read receipts.

## Time Clock And Timecards

Timecards represent actual work and are separate from schedules.

Clock actions:

- Clock in
- Start break
- End break
- Clock out

Timecard state:

- Clocked out
- Clocked in
- On break

Timecards are session-based:

- Clock-in creates an open timecard.
- Break events attach to the open timecard.
- Clock-out closes the timecard.
- Each employee can have only one open timecard at a time.
- Multiple timecards per employee per day are allowed if they are not simultaneous.

Every time event records its source:

- `station`
- `employee_web`
- `manager_edit`

Employees can clock in from the Location Station or employee web view. Clock actions can be mixed across sources; for example, an employee can clock in at the station and clock out from the employee web view.

GPS/geolocation verification is deferred.

## Attendance Matching

Clock-ins are allowed even when no matching shift exists.

If a clock-in can be matched to a shift, attach the timecard to that shift. Otherwise, mark it unscheduled.

MVP matching rule:

- Same employee.
- Same location.
- Published schedule.
- Shift starts on the same business date.
- Clock-in is within 2 hours before or after the scheduled start.
- If multiple shifts match, choose the nearest scheduled start.

Attendance status uses the published schedule only:

- Early: clock-in more than 5 minutes before scheduled start.
- On time: clock-in from 5 minutes before start through 5 minutes after start.
- Late: clock-in more than 5 minutes after scheduled start.
- No-show: no clock-in 15 minutes after scheduled start.
- Unscheduled: timecard has no matched shift.

Open shifts do not auto-assign on clock-in in the MVP.

## Manager Today Dashboard

The manager Today dashboard is scoped to the selected location and current day in that location's timezone.

It should show:

- Today's published schedule.
- Scheduled employees not clocked in.
- Clocked-in employees.
- Employees on break.
- Clocked-out employees.
- Unscheduled clock-ins.
- Late and no-show indicators.
- Recent punch activity.
- Quick links to schedules and reports.

Live attendance can update by polling every 5-10 seconds.

## Reports

Reports are in-app only for the MVP.

Report views:

- Daily timesheet detail.
- Weekly summary by employee.

Reports should show:

- Scheduled hours.
- Actual worked hours.
- Variance.
- Break time.
- Edited timecards.
- Late, no-show, early, and unscheduled indicators.

Deferred reporting features:

- Timecard approval workflows.
- Payroll export.
- CSV export.
- Overtime calculation.
- Payroll-grade labor compliance logic.

## Timecard Corrections

Managers can make basic timecard corrections:

- Add a missing clock-out.
- Adjust clock-in or clock-out times.
- Adjust or remove break intervals.
- Force-close an open timecard.
- Add a required correction note.

Corrections preserve a lightweight audit trail:

- Edited by.
- Edited at.
- Before/after values.
- Note/reason.

Normal UI should not delete historical timecards or timecard edit records.

## Locations

Locations are scoped to the seeded company.

Location settings:

- Name.
- Address.
- Timezone.
- Week start day.
- Late grace period.
- No-show threshold.
- Operating hours by day.
- Active/inactive status.

Location operating hours are used for schedule warnings, not hard blocks.

The selected location's timezone defines:

- Today.
- Schedule display.
- Timecard business date.
- Attendance grouping.

## Employees And Permissions

The MVP uses one domain entity for people: `Employee`.

Employees include:

- Name.
- Photo/avatar URL.
- Company-unique 4-digit PIN.
- App role: `admin`, `manager`, or `employee`.
- Assigned locations.
- Default position.
- Active/inactive status.
- Optional email/password fields for admin/manager login.

All active employees require a unique PIN. Admins and managers can also be scheduled and clock in.

Permission roles are separate from scheduled positions:

- App role controls product access.
- Position controls the job worked on a shift.

Inactive employees:

- Are hidden from normal schedule builder rows.
- Cannot log in by PIN.
- Cannot clock in.
- Remain visible in historical reports.

## Positions

Positions are location-scoped records with seeded defaults per location.

Examples:

- Manager
- Shift Lead
- Cashier
- Barista
- Cook
- Server

Every shift must have a position. Position names can repeat across locations as separate records.

## Data Model

Core MVP entities:

- `Company`
- `Location`
- `LocationHours`
- `Position`
- `Employee`
- `EmployeeLocation`
- `ManagerLocation`
- `Schedule`
- `Shift`
- `Timecard`
- `TimeEvent`
- `TimecardEdit`

Important relationships:

- Company has many locations and employees.
- Location has many schedules, positions, and timecards.
- Schedule belongs to one location and one schedule week.
- Shift belongs to one schedule and one position.
- Shift optionally belongs to one employee.
- Timecard belongs to one employee and one location.
- Timecard optionally links to one shift.
- TimeEvent belongs to one timecard.
- TimecardEdit belongs to one timecard and one manager/admin employee.

## Time And Dates

Shifts and time events should be stored as absolute timestamps and displayed in the relevant location's timezone.

Timecard business date is based on clock-in time in the location timezone. Overnight timecards report under the clock-in business date for the MVP.

Overnight shifts appear only in the start day cell in the schedule grid.

## Seed Data

The demo should seed realistic data:

- One company.
- Two locations.
- Admin/manager accounts with prefilled login forms.
- 8-12 employees with PINs and avatar URLs.
- Location-scoped positions.
- Current week published schedules.
- Next week unpublished schedules.
- Today's and recent timecards/events.
- A few realistic attendance exceptions.

## Deferred Technical Decisions

The implementation stack is intentionally deferred until product scope is locked.

The product plan should remain stack-agnostic for now. When implementation begins, choose a stack that can support:

- One responsive web app.
- Lightweight manager authentication.
- PIN-based employee access.
- Seeded demo data.
- Polling-based live attendance.
- Schedule and timecard persistence.
