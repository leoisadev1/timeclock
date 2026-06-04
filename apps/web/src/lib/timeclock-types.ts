export type LocationId = "loc-downtown" | "loc-riverside";
export type EmployeeId =
  | "emp-maya"
  | "emp-omar"
  | "emp-jules"
  | "emp-lena"
  | "emp-noah"
  | "emp-priya"
  | "emp-cam"
  | "emp-ivy"
  | "emp-sam"
  | "emp-eli";

export type Position = "Manager" | "Shift Lead" | "Barista" | "Cashier" | "Cook" | "Server";
export type AppRole = "admin" | "manager" | "employee";
export type TimecardStatus = "clocked-out" | "clocked-in" | "on-break";
export type AttendanceStatus = "early" | "on-time" | "late" | "no-show" | "unscheduled";
export type PunchSource = "station" | "employee_web" | "manager_edit";
export type PunchAction = "clock-in" | "start-break" | "end-break" | "clock-out";

export interface Location {
  id: LocationId;
  name: string;
  address: string;
  timezone: string;
  weekStart: "Monday" | "Sunday";
  graceMinutes: number;
  noShowMinutes: number;
  operatingHours: Record<string, string>;
  active: boolean;
}

export interface Employee {
  id: EmployeeId;
  name: string;
  initials: string;
  avatarColor: string;
  pin: string;
  role: AppRole;
  position: Position;
  active: boolean;
  assignedLocationIds: LocationId[];
  email?: string;
}

export interface Shift {
  id: string;
  locationId: LocationId;
  employeeId?: EmployeeId;
  day: string;
  start: string;
  end: string;
  position: Position;
  breakMinutes: number;
  notes?: string;
  overnight?: boolean;
  warning?: "overlap" | "outside-hours" | "high-weekly-hours" | "open-shift";
}

export interface ScheduleWeek {
  id: string;
  locationId: LocationId;
  weekStartDate: string;
  published: boolean;
  publishedAt?: string;
  updatedAt: string;
  shifts: Shift[];
}

export interface TimeEvent {
  id: string;
  employeeId: EmployeeId;
  locationId: LocationId;
  businessDate: string;
  time: string;
  action: PunchAction;
  source: PunchSource;
}

export interface Timecard {
  id: string;
  employeeId: EmployeeId;
  locationId: LocationId;
  businessDate: string;
  status: TimecardStatus;
  scheduledShiftId?: string;
  attendance: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  breakMinutes: number;
  edited?: boolean;
}

export interface TodayDashboard {
  location: Location;
  businessDate: string;
  schedule: ScheduleWeek;
  scheduledNotClockedIn: Employee[];
  clockedIn: Timecard[];
  onBreak: Timecard[];
  clockedOut: Timecard[];
  unscheduledClockIns: Timecard[];
  lateOrNoShow: Array<{ employee: Employee; status: AttendanceStatus; shift?: Shift }>;
  recentEvents: TimeEvent[];
}

export interface EmployeePortal {
  employee: Employee;
  location: Location;
  status: TimecardStatus;
  todayEvents: TimeEvent[];
  recentHistory: Timecard[];
  assignedShifts: Shift[];
  openShifts: Shift[];
  errors: string[];
}

export interface ReportRow {
  employee: Employee;
  scheduledHours: number;
  actualHours: number;
  variance: number;
  breakHours: number;
  edited: boolean;
  attendance: AttendanceStatus[];
}
