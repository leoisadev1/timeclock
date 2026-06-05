import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  addDays,
  classifyAttendance,
  DEMO_COMPANY_SLUG,
  formatIsoDateInTimezone,
  getWeekStartDate,
  HOUR_MS,
  zonedTimestamp,
} from "./shared";

const now = () => Date.now();

type LocationSeed = {
  key: string;
  name: string;
  address: string;
  timezone: string;
  weekStartDay: number;
  stationUnlockCode: string;
  hours: Array<{
    dayOfWeek: number;
    opensAtMinutes: number;
    closesAtMinutes: number;
    isClosed: boolean;
  }>;
  positions: Array<{ name: string; color: string }>;
};

type EmployeeSeed = {
  firstName: string;
  lastName: string;
  email?: string;
  demoPassword?: string;
  pin: string;
  avatarUrl: string;
  role: "admin" | "manager" | "employee";
  defaultPosition: string;
  active: boolean;
  locations: string[];
  manages?: string[];
};

const locations: LocationSeed[] = [
  {
    key: "downtown",
    name: "Downtown Cafe",
    address: "118 Spring St, New York, NY 10012",
    timezone: "America/New_York",
    weekStartDay: 1,
    stationUnlockCode: "2468",
    hours: [
      { dayOfWeek: 0, opensAtMinutes: 8 * 60, closesAtMinutes: 16 * 60, isClosed: false },
      { dayOfWeek: 1, opensAtMinutes: 6 * 60, closesAtMinutes: 18 * 60, isClosed: false },
      { dayOfWeek: 2, opensAtMinutes: 6 * 60, closesAtMinutes: 18 * 60, isClosed: false },
      { dayOfWeek: 3, opensAtMinutes: 6 * 60, closesAtMinutes: 18 * 60, isClosed: false },
      { dayOfWeek: 4, opensAtMinutes: 6 * 60, closesAtMinutes: 18 * 60, isClosed: false },
      { dayOfWeek: 5, opensAtMinutes: 6 * 60, closesAtMinutes: 20 * 60, isClosed: false },
      { dayOfWeek: 6, opensAtMinutes: 7 * 60, closesAtMinutes: 20 * 60, isClosed: false },
    ],
    positions: [
      { name: "Manager", color: "#2563eb" },
      { name: "Shift Lead", color: "#0f766e" },
      { name: "Cashier", color: "#ca8a04" },
      { name: "Barista", color: "#9333ea" },
      { name: "Cook", color: "#dc2626" },
    ],
  },
  {
    key: "riverside",
    name: "Riverside Bistro",
    address: "42 Riverwalk Ave, Chicago, IL 60601",
    timezone: "America/Chicago",
    weekStartDay: 1,
    stationUnlockCode: "1357",
    hours: [
      { dayOfWeek: 0, opensAtMinutes: 10 * 60, closesAtMinutes: 21 * 60, isClosed: false },
      { dayOfWeek: 1, opensAtMinutes: 11 * 60, closesAtMinutes: 21 * 60, isClosed: false },
      { dayOfWeek: 2, opensAtMinutes: 11 * 60, closesAtMinutes: 21 * 60, isClosed: false },
      { dayOfWeek: 3, opensAtMinutes: 11 * 60, closesAtMinutes: 21 * 60, isClosed: false },
      { dayOfWeek: 4, opensAtMinutes: 11 * 60, closesAtMinutes: 22 * 60, isClosed: false },
      { dayOfWeek: 5, opensAtMinutes: 11 * 60, closesAtMinutes: 23 * 60, isClosed: false },
      { dayOfWeek: 6, opensAtMinutes: 10 * 60, closesAtMinutes: 23 * 60, isClosed: false },
    ],
    positions: [
      { name: "Manager", color: "#2563eb" },
      { name: "Shift Lead", color: "#0f766e" },
      { name: "Server", color: "#ca8a04" },
      { name: "Cook", color: "#dc2626" },
      { name: "Cashier", color: "#9333ea" },
    ],
  },
];

const employees: EmployeeSeed[] = [
  {
    firstName: "Avery",
    lastName: "Morgan",
    email: "admin@timeclock.demo",
    demoPassword: "demo-admin",
    pin: "1001",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Avery",
    role: "admin",
    defaultPosition: "Manager",
    active: true,
    locations: ["downtown", "riverside"],
    manages: ["downtown", "riverside"],
  },
  {
    firstName: "Mia",
    lastName: "Chen",
    email: "manager@timeclock.demo",
    demoPassword: "demo-manager",
    pin: "1002",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Mia",
    role: "manager",
    defaultPosition: "Manager",
    active: true,
    locations: ["downtown"],
    manages: ["downtown"],
  },
  {
    firstName: "Noah",
    lastName: "Patel",
    email: "riverside-manager@timeclock.demo",
    demoPassword: "demo-manager",
    pin: "1003",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Noah",
    role: "manager",
    defaultPosition: "Manager",
    active: true,
    locations: ["riverside"],
    manages: ["riverside"],
  },
  {
    firstName: "Sam",
    lastName: "Rivera",
    pin: "2145",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Sam",
    role: "employee",
    defaultPosition: "Barista",
    active: true,
    locations: ["downtown"],
  },
  {
    firstName: "Jordan",
    lastName: "Kim",
    pin: "3882",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Jordan",
    role: "employee",
    defaultPosition: "Cashier",
    active: true,
    locations: ["downtown"],
  },
  {
    firstName: "Lina",
    lastName: "Brooks",
    pin: "4729",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Lina",
    role: "employee",
    defaultPosition: "Cook",
    active: true,
    locations: ["downtown"],
  },
  {
    firstName: "Chris",
    lastName: "Evans",
    pin: "5308",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Chris",
    role: "employee",
    defaultPosition: "Shift Lead",
    active: true,
    locations: ["downtown", "riverside"],
  },
  {
    firstName: "Priya",
    lastName: "Shah",
    pin: "6194",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Priya",
    role: "employee",
    defaultPosition: "Server",
    active: true,
    locations: ["riverside"],
  },
  {
    firstName: "Owen",
    lastName: "Garcia",
    pin: "7426",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Owen",
    role: "employee",
    defaultPosition: "Cook",
    active: true,
    locations: ["riverside"],
  },
  {
    firstName: "Nora",
    lastName: "Singh",
    pin: "8651",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Nora",
    role: "employee",
    defaultPosition: "Server",
    active: true,
    locations: ["riverside"],
  },
  {
    firstName: "Alex",
    lastName: "Taylor",
    pin: "9017",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Alex",
    role: "employee",
    defaultPosition: "Cashier",
    active: true,
    locations: ["downtown"],
  },
  {
    firstName: "Emma",
    lastName: "Walsh",
    pin: "2461",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Emma",
    role: "employee",
    defaultPosition: "Barista",
    active: true,
    locations: ["downtown"],
  },
  {
    firstName: "Brooke",
    lastName: "Reed",
    pin: "7935",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Brooke",
    role: "employee",
    defaultPosition: "Barista",
    active: true,
    locations: ["downtown"],
  },
  {
    firstName: "Mateo",
    lastName: "Lopez",
    pin: "3570",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Mateo",
    role: "employee",
    defaultPosition: "Cook",
    active: true,
    locations: ["downtown"],
  },
  {
    firstName: "Tess",
    lastName: "Nguyen",
    pin: "6842",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Tess",
    role: "employee",
    defaultPosition: "Shift Lead",
    active: true,
    locations: ["downtown"],
  },
  {
    firstName: "Riley",
    lastName: "Moore",
    pin: "2784",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Riley",
    role: "employee",
    defaultPosition: "Server",
    active: true,
    locations: ["riverside"],
  },
  {
    firstName: "Harper",
    lastName: "Cole",
    pin: "3495",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Harper",
    role: "employee",
    defaultPosition: "Cook",
    active: true,
    locations: ["riverside"],
  },
  {
    firstName: "Quinn",
    lastName: "Parker",
    pin: "4568",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Quinn",
    role: "employee",
    defaultPosition: "Cashier",
    active: true,
    locations: ["riverside"],
  },
  {
    firstName: "Sloane",
    lastName: "Bennett",
    pin: "5973",
    avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Sloane",
    role: "employee",
    defaultPosition: "Cashier",
    active: true,
    locations: ["riverside"],
  },
];

async function upsertCompany(ctx: MutationCtx) {
  const existing = await ctx.db
    .query("companies")
    .withIndex("by_slug", (q) => q.eq("slug", DEMO_COMPANY_SLUG))
    .unique();
  const timestamp = now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      name: "Coastal Cafe Group",
      updatedAt: timestamp,
    });
    return existing._id;
  }
  return await ctx.db.insert("companies", {
    name: "Coastal Cafe Group",
    slug: DEMO_COMPANY_SLUG,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function upsertLocation(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  seed: LocationSeed,
): Promise<Id<"locations">> {
  const existingLocations = await ctx.db
    .query("locations")
    .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
    .take(20);
  const existing = existingLocations.find((location) => location.name === seed.name);
  const timestamp = now();
  const data = {
    companyId,
    name: seed.name,
    address: seed.address,
    timezone: seed.timezone,
    weekStartDay: seed.weekStartDay,
    lateGraceMinutes: 5,
    noShowThresholdMinutes: 15,
    stationUnlockCode: seed.stationUnlockCode,
    active: true,
    updatedAt: timestamp,
  };
  const locationId = existing
    ? existing._id
    : await ctx.db.insert("locations", { ...data, createdAt: timestamp });
  if (existing) {
    await ctx.db.patch(existing._id, data);
  }

  for (const hours of seed.hours) {
    const existingHours = await ctx.db
      .query("locationHours")
      .withIndex("by_locationId_and_dayOfWeek", (q) =>
        q.eq("locationId", locationId).eq("dayOfWeek", hours.dayOfWeek),
      )
      .unique();
    if (existingHours) {
      await ctx.db.patch(existingHours._id, hours);
    } else {
      await ctx.db.insert("locationHours", { locationId, ...hours });
    }
  }

  return locationId;
}

async function upsertPositions(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  locationId: Id<"locations">,
  seed: LocationSeed,
): Promise<Map<string, Id<"positions">>> {
  const ids = new Map<string, Id<"positions">>();
  const timestamp = now();
  for (const position of seed.positions) {
    const existing = await ctx.db
      .query("positions")
      .withIndex("by_locationId_and_name", (q) =>
        q.eq("locationId", locationId).eq("name", position.name),
      )
      .unique();
    const data = {
      companyId,
      locationId,
      name: position.name,
      color: position.color,
      active: true,
      updatedAt: timestamp,
    };
    if (existing) {
      await ctx.db.patch(existing._id, data);
      ids.set(position.name, existing._id);
    } else {
      const id = await ctx.db.insert("positions", { ...data, createdAt: timestamp });
      ids.set(position.name, id);
    }
  }
  return ids;
}

async function upsertEmployee(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  seed: EmployeeSeed,
  locationIds: Map<string, Id<"locations">>,
  positionIds: Map<string, Map<string, Id<"positions">>>,
): Promise<Id<"employees">> {
  const existing = await ctx.db
    .query("employees")
    .withIndex("by_companyId_and_pin", (q) => q.eq("companyId", companyId).eq("pin", seed.pin))
    .unique();
  const firstLocationKey = seed.locations[0];
  const defaultPositionId = positionIds.get(firstLocationKey)?.get(seed.defaultPosition);
  if (!defaultPositionId) {
    throw new Error(`Missing default position ${seed.defaultPosition} for ${seed.firstName}`);
  }
  const timestamp = now();
  const data = {
    companyId,
    firstName: seed.firstName,
    lastName: seed.lastName,
    displayName: `${seed.firstName} ${seed.lastName}`,
    pin: seed.pin,
    avatarUrl: seed.avatarUrl,
    role: seed.role,
    defaultPositionId,
    active: seed.active,
    updatedAt: timestamp,
  };
  const employeeData = {
    ...data,
    ...(seed.email !== undefined ? { email: seed.email } : {}),
    ...(seed.demoPassword !== undefined ? { demoPassword: seed.demoPassword } : {}),
  };
  const employeeId = existing
    ? existing._id
    : await ctx.db.insert("employees", { ...employeeData, createdAt: timestamp });
  if (existing) {
    await ctx.db.patch(existing._id, employeeData);
  }

  for (const locationKey of seed.locations) {
    const locationId = locationIds.get(locationKey);
    if (!locationId) {
      throw new Error(`Missing location ${locationKey}`);
    }
    const assignment = await ctx.db
      .query("employeeLocations")
      .withIndex("by_employeeId_and_locationId", (q) =>
        q.eq("employeeId", employeeId).eq("locationId", locationId),
      )
      .unique();
    const assignmentData = { employeeId, locationId, active: true, updatedAt: timestamp };
    if (assignment) {
      await ctx.db.patch(assignment._id, assignmentData);
    } else {
      await ctx.db.insert("employeeLocations", { ...assignmentData, createdAt: timestamp });
    }
  }

  for (const locationKey of seed.manages ?? []) {
    const locationId = locationIds.get(locationKey);
    if (!locationId) {
      throw new Error(`Missing manager location ${locationKey}`);
    }
    const assignment = await ctx.db
      .query("managerLocations")
      .withIndex("by_managerId_and_locationId", (q) =>
        q.eq("managerId", employeeId).eq("locationId", locationId),
      )
      .unique();
    const assignmentData = {
      managerId: employeeId,
      locationId,
      active: true,
      updatedAt: timestamp,
    };
    if (assignment) {
      await ctx.db.patch(assignment._id, assignmentData);
    } else {
      await ctx.db.insert("managerLocations", { ...assignmentData, createdAt: timestamp });
    }
  }

  return employeeId;
}

async function upsertSchedule(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  locationId: Id<"locations">,
  weekStartDate: string,
  isPublished: boolean,
): Promise<Id<"schedules">> {
  const existing = await ctx.db
    .query("schedules")
    .withIndex("by_locationId_and_weekStartDate", (q) =>
      q.eq("locationId", locationId).eq("weekStartDate", weekStartDate),
    )
    .unique();
  const timestamp = now();
  const data = {
    companyId,
    locationId,
    weekStartDate,
    isPublished,
    updatedAt: timestamp,
  };
  const scheduleData = {
    ...data,
    ...(isPublished ? { publishedAt: timestamp } : {}),
  };
  if (existing) {
    await ctx.db.replace(existing._id, { ...scheduleData, createdAt: existing.createdAt });
    return existing._id;
  }
  return await ctx.db.insert("schedules", { ...scheduleData, createdAt: timestamp });
}

async function clearScheduleShifts(ctx: MutationCtx, scheduleId: Id<"schedules">) {
  const existing = await ctx.db
    .query("shifts")
    .withIndex("by_scheduleId", (q) => q.eq("scheduleId", scheduleId))
    .take(100);
  for (const shift of existing) {
    await ctx.db.delete(shift._id);
  }
}

async function insertShift(
  ctx: MutationCtx,
  scheduleId: Id<"schedules">,
  locationId: Id<"locations">,
  timezone: string,
  date: string,
  startMinutes: number,
  endMinutes: number,
  positionId: Id<"positions">,
  employeeId?: Id<"employees">,
  notes?: string,
) {
  const startAt = zonedTimestamp(date, startMinutes, timezone);
  const endDate = endMinutes <= startMinutes ? addDays(date, 1) : date;
  const endAt = zonedTimestamp(endDate, endMinutes, timezone);
  const timestamp = now();
  return await ctx.db.insert("shifts", {
    scheduleId,
    locationId,
    positionId,
    startAt,
    endAt,
    startBusinessDate: date,
    plannedBreakMinutes: endAt - startAt >= 6 * HOUR_MS ? 30 : 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(employeeId !== undefined ? { employeeId } : {}),
    ...(notes !== undefined ? { notes } : {}),
  });
}

type ShiftTemplate = {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  position: string;
  pin?: string;
  notes?: string;
};

const weeklyShiftTemplates: Record<string, ShiftTemplate[]> = {
  downtown: [
    { dayOfWeek: 1, startMinutes: 6 * 60, endMinutes: 14 * 60, position: "Manager", pin: "1002" },
    { dayOfWeek: 1, startMinutes: 6 * 60, endMinutes: 14 * 60, position: "Barista", pin: "2145" },
    {
      dayOfWeek: 1,
      startMinutes: 6 * 60 + 30,
      endMinutes: 14 * 60 + 30,
      position: "Cook",
      pin: "4729",
    },
    { dayOfWeek: 1, startMinutes: 8 * 60, endMinutes: 16 * 60, position: "Cashier", pin: "3882" },
    {
      dayOfWeek: 1,
      startMinutes: 12 * 60,
      endMinutes: 18 * 60,
      position: "Shift Lead",
      pin: "6842",
    },
    { dayOfWeek: 1, startMinutes: 12 * 60, endMinutes: 18 * 60, position: "Barista", pin: "7935" },
    {
      dayOfWeek: 1,
      startMinutes: 15 * 60,
      endMinutes: 19 * 60,
      position: "Cashier",
      pin: "3882",
      notes: "Demo alert: overlaps Jordan's morning shift.",
    },

    { dayOfWeek: 2, startMinutes: 6 * 60, endMinutes: 14 * 60, position: "Barista", pin: "2461" },
    { dayOfWeek: 2, startMinutes: 7 * 60, endMinutes: 15 * 60, position: "Cook", pin: "3570" },
    { dayOfWeek: 2, startMinutes: 8 * 60, endMinutes: 16 * 60, position: "Cashier", pin: "9017" },
    { dayOfWeek: 2, startMinutes: 10 * 60, endMinutes: 18 * 60, position: "Manager", pin: "1002" },
    { dayOfWeek: 2, startMinutes: 12 * 60, endMinutes: 18 * 60, position: "Cashier", pin: "3882" },

    { dayOfWeek: 3, startMinutes: 6 * 60, endMinutes: 14 * 60, position: "Manager", pin: "1002" },
    { dayOfWeek: 3, startMinutes: 6 * 60, endMinutes: 14 * 60, position: "Barista", pin: "2145" },
    { dayOfWeek: 3, startMinutes: 7 * 60, endMinutes: 15 * 60, position: "Cook", pin: "4729" },
    { dayOfWeek: 3, startMinutes: 8 * 60, endMinutes: 16 * 60, position: "Cashier", pin: "3882" },
    {
      dayOfWeek: 3,
      startMinutes: 12 * 60,
      endMinutes: 18 * 60,
      position: "Shift Lead",
      pin: "6842",
    },
    { dayOfWeek: 3, startMinutes: 12 * 60, endMinutes: 18 * 60, position: "Barista", pin: "7935" },
    {
      dayOfWeek: 3,
      startMinutes: 10 * 60,
      endMinutes: 16 * 60,
      position: "Cashier",
      notes: "Demo alert: open shift needs coverage.",
    },

    { dayOfWeek: 4, startMinutes: 6 * 60, endMinutes: 14 * 60, position: "Barista", pin: "2461" },
    { dayOfWeek: 4, startMinutes: 7 * 60, endMinutes: 15 * 60, position: "Cook", pin: "3570" },
    { dayOfWeek: 4, startMinutes: 8 * 60, endMinutes: 16 * 60, position: "Cashier", pin: "9017" },
    { dayOfWeek: 4, startMinutes: 10 * 60, endMinutes: 18 * 60, position: "Manager", pin: "1001" },
    {
      dayOfWeek: 4,
      startMinutes: 12 * 60,
      endMinutes: 18 * 60,
      position: "Shift Lead",
      pin: "6842",
    },
    { dayOfWeek: 4, startMinutes: 12 * 60, endMinutes: 18 * 60, position: "Barista", pin: "2145" },
    {
      dayOfWeek: 4,
      startMinutes: 15 * 60,
      endMinutes: 22 * 60,
      position: "Barista",
      pin: "2145",
      notes: "Demo alert: ends after operating hours.",
    },

    { dayOfWeek: 5, startMinutes: 6 * 60, endMinutes: 14 * 60, position: "Manager", pin: "1002" },
    { dayOfWeek: 5, startMinutes: 6 * 60, endMinutes: 14 * 60, position: "Barista", pin: "2145" },
    { dayOfWeek: 5, startMinutes: 7 * 60, endMinutes: 15 * 60, position: "Cook", pin: "4729" },
    { dayOfWeek: 5, startMinutes: 8 * 60, endMinutes: 16 * 60, position: "Cashier", pin: "3882" },
    {
      dayOfWeek: 5,
      startMinutes: 12 * 60,
      endMinutes: 20 * 60,
      position: "Shift Lead",
      pin: "6842",
    },
    { dayOfWeek: 5, startMinutes: 12 * 60, endMinutes: 20 * 60, position: "Barista", pin: "2461" },
    { dayOfWeek: 5, startMinutes: 12 * 60, endMinutes: 20 * 60, position: "Cook", pin: "3570" },
    { dayOfWeek: 5, startMinutes: 14 * 60, endMinutes: 20 * 60, position: "Cashier", pin: "9017" },

    { dayOfWeek: 6, startMinutes: 7 * 60, endMinutes: 15 * 60, position: "Manager", pin: "1001" },
    { dayOfWeek: 6, startMinutes: 7 * 60, endMinutes: 15 * 60, position: "Barista", pin: "2461" },
    { dayOfWeek: 6, startMinutes: 7 * 60, endMinutes: 15 * 60, position: "Cook", pin: "3570" },
    { dayOfWeek: 6, startMinutes: 9 * 60, endMinutes: 17 * 60, position: "Cashier", pin: "9017" },
    {
      dayOfWeek: 6,
      startMinutes: 10 * 60,
      endMinutes: 18 * 60,
      position: "Shift Lead",
      pin: "6842",
    },
    { dayOfWeek: 6, startMinutes: 12 * 60, endMinutes: 20 * 60, position: "Barista", pin: "2145" },
    { dayOfWeek: 6, startMinutes: 12 * 60, endMinutes: 20 * 60, position: "Cook", pin: "4729" },
    { dayOfWeek: 6, startMinutes: 12 * 60, endMinutes: 20 * 60, position: "Barista", pin: "7935" },

    { dayOfWeek: 0, startMinutes: 8 * 60, endMinutes: 14 * 60, position: "Manager", pin: "1002" },
    { dayOfWeek: 0, startMinutes: 8 * 60, endMinutes: 16 * 60, position: "Barista", pin: "7935" },
    { dayOfWeek: 0, startMinutes: 8 * 60, endMinutes: 16 * 60, position: "Cook", pin: "4729" },
    { dayOfWeek: 0, startMinutes: 10 * 60, endMinutes: 16 * 60, position: "Cashier", pin: "9017" },
    {
      dayOfWeek: 0,
      startMinutes: 10 * 60,
      endMinutes: 16 * 60,
      position: "Shift Lead",
      pin: "6842",
    },
  ],
  riverside: [
    { dayOfWeek: 1, startMinutes: 11 * 60, endMinutes: 19 * 60, position: "Manager", pin: "1003" },
    { dayOfWeek: 1, startMinutes: 11 * 60, endMinutes: 18 * 60, position: "Server", pin: "6194" },
    { dayOfWeek: 1, startMinutes: 11 * 60, endMinutes: 19 * 60, position: "Cook", pin: "7426" },
    { dayOfWeek: 1, startMinutes: 12 * 60, endMinutes: 20 * 60, position: "Cashier", pin: "4568" },
    {
      dayOfWeek: 1,
      startMinutes: 15 * 60,
      endMinutes: 21 * 60,
      position: "Shift Lead",
      pin: "5308",
    },
    { dayOfWeek: 1, startMinutes: 16 * 60, endMinutes: 21 * 60, position: "Server", pin: "2784" },

    {
      dayOfWeek: 2,
      startMinutes: 11 * 60,
      endMinutes: 19 * 60,
      position: "Shift Lead",
      pin: "5308",
    },
    { dayOfWeek: 2, startMinutes: 11 * 60, endMinutes: 18 * 60, position: "Server", pin: "8651" },
    { dayOfWeek: 2, startMinutes: 11 * 60, endMinutes: 19 * 60, position: "Cook", pin: "3495" },
    { dayOfWeek: 2, startMinutes: 12 * 60, endMinutes: 20 * 60, position: "Cashier", pin: "5973" },
    { dayOfWeek: 2, startMinutes: 13 * 60, endMinutes: 21 * 60, position: "Manager", pin: "1001" },
    { dayOfWeek: 2, startMinutes: 16 * 60, endMinutes: 21 * 60, position: "Server", pin: "6194" },

    { dayOfWeek: 3, startMinutes: 11 * 60, endMinutes: 19 * 60, position: "Manager", pin: "1003" },
    { dayOfWeek: 3, startMinutes: 11 * 60, endMinutes: 18 * 60, position: "Server", pin: "2784" },
    { dayOfWeek: 3, startMinutes: 11 * 60, endMinutes: 19 * 60, position: "Cook", pin: "7426" },
    { dayOfWeek: 3, startMinutes: 12 * 60, endMinutes: 20 * 60, position: "Cashier", pin: "4568" },
    { dayOfWeek: 3, startMinutes: 16 * 60, endMinutes: 21 * 60, position: "Server", pin: "8651" },

    {
      dayOfWeek: 4,
      startMinutes: 11 * 60,
      endMinutes: 19 * 60,
      position: "Shift Lead",
      pin: "5308",
    },
    { dayOfWeek: 4, startMinutes: 11 * 60, endMinutes: 18 * 60, position: "Server", pin: "6194" },
    { dayOfWeek: 4, startMinutes: 11 * 60, endMinutes: 19 * 60, position: "Cook", pin: "3495" },
    { dayOfWeek: 4, startMinutes: 12 * 60, endMinutes: 20 * 60, position: "Cashier", pin: "5973" },
    { dayOfWeek: 4, startMinutes: 14 * 60, endMinutes: 22 * 60, position: "Manager", pin: "1003" },
    { dayOfWeek: 4, startMinutes: 16 * 60, endMinutes: 22 * 60, position: "Server", pin: "2784" },

    { dayOfWeek: 5, startMinutes: 11 * 60, endMinutes: 19 * 60, position: "Manager", pin: "1003" },
    { dayOfWeek: 5, startMinutes: 11 * 60, endMinutes: 18 * 60, position: "Server", pin: "8651" },
    { dayOfWeek: 5, startMinutes: 11 * 60, endMinutes: 19 * 60, position: "Cook", pin: "7426" },
    { dayOfWeek: 5, startMinutes: 12 * 60, endMinutes: 20 * 60, position: "Cashier", pin: "4568" },
    {
      dayOfWeek: 5,
      startMinutes: 15 * 60,
      endMinutes: 23 * 60,
      position: "Shift Lead",
      pin: "5308",
    },
    { dayOfWeek: 5, startMinutes: 15 * 60, endMinutes: 23 * 60, position: "Cook", pin: "3495" },
    { dayOfWeek: 5, startMinutes: 16 * 60, endMinutes: 23 * 60, position: "Server", pin: "6194" },
    { dayOfWeek: 5, startMinutes: 17 * 60, endMinutes: 23 * 60, position: "Server", pin: "2784" },

    { dayOfWeek: 6, startMinutes: 10 * 60, endMinutes: 16 * 60, position: "Manager", pin: "1001" },
    { dayOfWeek: 6, startMinutes: 10 * 60, endMinutes: 17 * 60, position: "Server", pin: "6194" },
    { dayOfWeek: 6, startMinutes: 10 * 60, endMinutes: 18 * 60, position: "Cook", pin: "3495" },
    { dayOfWeek: 6, startMinutes: 11 * 60, endMinutes: 19 * 60, position: "Cashier", pin: "4568" },
    {
      dayOfWeek: 6,
      startMinutes: 15 * 60,
      endMinutes: 23 * 60,
      position: "Shift Lead",
      pin: "5308",
    },
    { dayOfWeek: 6, startMinutes: 15 * 60, endMinutes: 23 * 60, position: "Cook", pin: "7426" },
    { dayOfWeek: 6, startMinutes: 16 * 60, endMinutes: 23 * 60, position: "Server", pin: "8651" },
    { dayOfWeek: 6, startMinutes: 16 * 60, endMinutes: 23 * 60, position: "Server", pin: "2784" },

    { dayOfWeek: 0, startMinutes: 10 * 60, endMinutes: 16 * 60, position: "Manager", pin: "1003" },
    { dayOfWeek: 0, startMinutes: 10 * 60, endMinutes: 17 * 60, position: "Server", pin: "2784" },
    { dayOfWeek: 0, startMinutes: 10 * 60, endMinutes: 18 * 60, position: "Cook", pin: "7426" },
    { dayOfWeek: 0, startMinutes: 11 * 60, endMinutes: 19 * 60, position: "Cashier", pin: "5973" },
    { dayOfWeek: 0, startMinutes: 13 * 60, endMinutes: 21 * 60, position: "Cook", pin: "3495" },
    { dayOfWeek: 0, startMinutes: 15 * 60, endMinutes: 21 * 60, position: "Server", pin: "8651" },
  ],
};

function templatesForLocation(locationKey: string, dayOfWeek: number) {
  const templates = weeklyShiftTemplates[locationKey]?.filter(
    (template) => template.dayOfWeek === dayOfWeek,
  );
  if (!templates?.length) {
    throw new Error(`Missing weekly shift template for ${locationKey} day ${dayOfWeek}`);
  }
  return templates;
}

async function seedWeekShifts(
  ctx: MutationCtx,
  scheduleId: Id<"schedules">,
  locationSeed: LocationSeed,
  locationId: Id<"locations">,
  weekStartDate: string,
  positionsForLocation: Map<string, Id<"positions">>,
  employeeIds: Map<string, Id<"employees">>,
  seededShiftIds: Map<string, Id<"shifts">>,
  today: string,
) {
  for (let day = 0; day < 7; day += 1) {
    const date = addDays(weekStartDate, day);
    const dayOfWeek = (locationSeed.weekStartDay + day) % 7;
    for (const template of templatesForLocation(locationSeed.key, dayOfWeek)) {
      const positionId = positionsForLocation.get(template.position);
      if (!positionId) {
        throw new Error(`Missing position ${template.position} for ${locationSeed.key}`);
      }
      const employeeId = template.pin ? employeeIds.get(template.pin) : undefined;
      if (template.pin && !employeeId) {
        throw new Error(`Missing employee with PIN ${template.pin}`);
      }
      const shiftId = await insertShift(
        ctx,
        scheduleId,
        locationId,
        locationSeed.timezone,
        date,
        template.startMinutes,
        template.endMinutes,
        positionId,
        employeeId,
        template.notes,
      );
      if (locationSeed.key === "downtown" && date === today) {
        if (template.pin === "2145") seededShiftIds.set("samToday", shiftId);
        if (template.pin === "3882") seededShiftIds.set("jordanToday", shiftId);
        if (template.pin === "4729") seededShiftIds.set("linaToday", shiftId);
      }
    }
  }
}

async function seedSchedules(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  locationIds: Map<string, Id<"locations">>,
  employeeIds: Map<string, Id<"employees">>,
  positionIds: Map<string, Map<string, Id<"positions">>>,
) {
  const seededShiftIds = new Map<string, Id<"shifts">>();
  for (const locationSeed of locations) {
    const locationId = locationIds.get(locationSeed.key);
    if (!locationId) {
      throw new Error(`Missing location ${locationSeed.key}`);
    }
    const today = formatIsoDateInTimezone(now(), locationSeed.timezone);
    const currentWeekStart = getWeekStartDate(today, locationSeed.weekStartDay);
    const seedWeekOffsets = [-14, -7, 0, 7, 14, 21, 28];

    const positionsForLocation = positionIds.get(locationSeed.key);
    if (!positionsForLocation) {
      throw new Error(`Missing positions for ${locationSeed.key}`);
    }

    for (const offsetDays of seedWeekOffsets) {
      const weekStart = addDays(currentWeekStart, offsetDays);
      const isCurrentWeek = offsetDays === 0;
      const scheduleId = await upsertSchedule(
        ctx,
        companyId,
        locationId,
        weekStart,
        offsetDays <= 0,
      );
      await clearScheduleShifts(ctx, scheduleId);
      await seedWeekShifts(
        ctx,
        scheduleId,
        locationSeed,
        locationId,
        weekStart,
        positionsForLocation,
        employeeIds,
        isCurrentWeek ? seededShiftIds : new Map(),
        isCurrentWeek ? today : "",
      );
    }
  }
  return seededShiftIds;
}

async function deleteTimecardTree(ctx: MutationCtx, timecardId: Id<"timecards">) {
  const events = await ctx.db
    .query("timeEvents")
    .withIndex("by_timecardId", (q) => q.eq("timecardId", timecardId))
    .take(50);
  for (const event of events) {
    await ctx.db.delete(event._id);
  }
  const edits = await ctx.db
    .query("timecardEdits")
    .withIndex("by_timecardId", (q) => q.eq("timecardId", timecardId))
    .take(20);
  for (const edit of edits) {
    await ctx.db.delete(edit._id);
  }
  await ctx.db.delete(timecardId);
}

async function clearSeededTimecards(
  ctx: MutationCtx,
  locationId: Id<"locations">,
  businessDates: string[],
) {
  for (const businessDate of businessDates) {
    const existing = await ctx.db
      .query("timecards")
      .withIndex("by_locationId_and_businessDate", (q) =>
        q.eq("locationId", locationId).eq("businessDate", businessDate),
      )
      .take(100);
    for (const timecard of existing) {
      await deleteTimecardTree(ctx, timecard._id);
    }
  }
}

async function insertTimecard(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  locationId: Id<"locations">,
  employeeId: Id<"employees">,
  businessDate: string,
  clockInAt: number,
  status: "clocked_in" | "on_break" | "clocked_out",
  source: "station" | "employee_web",
  shiftId?: Id<"shifts">,
  clockOutAt?: number,
  totalBreakMinutes = 0,
) {
  const shift = shiftId ? await ctx.db.get(shiftId) : null;
  const timestamp = now();
  const timecardId = await ctx.db.insert("timecards", {
    companyId,
    locationId,
    employeeId,
    businessDate,
    clockInAt,
    status,
    attendanceStatus: classifyAttendance(clockInAt, shift?.startAt ?? null),
    totalBreakMinutes,
    source,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(shiftId !== undefined ? { shiftId } : {}),
    ...(clockOutAt !== undefined ? { clockOutAt } : {}),
  });
  await ctx.db.insert("timeEvents", {
    timecardId,
    type: "clock_in",
    occurredAt: clockInAt,
    source,
    createdAt: timestamp,
  });
  if (status === "on_break") {
    await ctx.db.insert("timeEvents", {
      timecardId,
      type: "start_break",
      occurredAt: Math.max(clockInAt + 4 * HOUR_MS, timestamp - 20 * 60 * 1000),
      source,
      createdAt: timestamp,
    });
  }
  if (clockOutAt) {
    await ctx.db.insert("timeEvents", {
      timecardId,
      type: "clock_out",
      occurredAt: clockOutAt,
      source,
      createdAt: timestamp,
    });
  }
  return timecardId;
}

async function seedTimecards(
  ctx: MutationCtx,
  companyId: Id<"companies">,
  locationIds: Map<string, Id<"locations">>,
  employeeIds: Map<string, Id<"employees">>,
  shiftIds: Map<string, Id<"shifts">>,
) {
  const downtown = locations[0];
  const downtownLocationId = locationIds.get("downtown")!;
  const today = formatIsoDateInTimezone(now(), downtown.timezone);
  const yesterday = addDays(today, -1);
  await clearSeededTimecards(ctx, downtownLocationId, [today, yesterday]);

  const samTodayShiftId = shiftIds.get("samToday");
  const jordanTodayShiftId = shiftIds.get("jordanToday");
  const linaTodayShiftId = shiftIds.get("linaToday");
  const samShift = samTodayShiftId ? await ctx.db.get(samTodayShiftId) : null;
  const jordanShift = jordanTodayShiftId ? await ctx.db.get(jordanTodayShiftId) : null;
  const linaShift = linaTodayShiftId ? await ctx.db.get(linaTodayShiftId) : null;
  if (samShift) {
    await insertTimecard(
      ctx,
      companyId,
      downtownLocationId,
      employeeIds.get("2145")!,
      today,
      samShift.startAt + 2 * 60 * 1000,
      "on_break",
      "station",
      samShift._id,
    );
  }
  if (jordanShift) {
    await insertTimecard(
      ctx,
      companyId,
      downtownLocationId,
      employeeIds.get("3882")!,
      today,
      jordanShift.startAt + 17 * 60 * 1000,
      "clocked_in",
      "employee_web",
      jordanShift._id,
    );
  }
  if (linaShift) {
    const timecardId = await insertTimecard(
      ctx,
      companyId,
      downtownLocationId,
      employeeIds.get("4729")!,
      yesterday,
      zonedTimestamp(yesterday, 7 * 60 + 1, downtown.timezone),
      "clocked_out",
      "station",
      undefined,
      zonedTimestamp(yesterday, 15 * 60 + 8, downtown.timezone),
      30,
    );
    await ctx.db.insert("timecardEdits", {
      timecardId,
      editedByEmployeeId: employeeIds.get("1002")!,
      editedAt: now(),
      before: {
        clockInAt: zonedTimestamp(yesterday, 7 * 60 + 1, downtown.timezone),
        clockOutAt: null,
        status: "clocked_in",
        attendanceStatus: "unscheduled",
        totalBreakMinutes: 0,
        shiftId: null,
      },
      after: {
        clockInAt: zonedTimestamp(yesterday, 7 * 60 + 1, downtown.timezone),
        clockOutAt: zonedTimestamp(yesterday, 15 * 60 + 8, downtown.timezone),
        status: "clocked_out",
        attendanceStatus: "unscheduled",
        totalBreakMinutes: 30,
        shiftId: null,
      },
      note: "Demo correction: added missing clock-out from closing notes.",
    });
  }
  await insertTimecard(
    ctx,
    companyId,
    downtownLocationId,
    employeeIds.get("9017")!,
    today,
    zonedTimestamp(today, 9 * 60 + 12, downtown.timezone),
    "clocked_in",
    "station",
  );
}

export async function ensureDemoData(ctx: MutationCtx) {
  const companyId = await upsertCompany(ctx);
  const locationIds = new Map<string, Id<"locations">>();
  const positionIds = new Map<string, Map<string, Id<"positions">>>();
  for (const locationSeed of locations) {
    const locationId = await upsertLocation(ctx, companyId, locationSeed);
    locationIds.set(locationSeed.key, locationId);
    positionIds.set(
      locationSeed.key,
      await upsertPositions(ctx, companyId, locationId, locationSeed),
    );
  }

  const employeeIds = new Map<string, Id<"employees">>();
  for (const employeeSeed of employees) {
    employeeIds.set(
      employeeSeed.pin,
      await upsertEmployee(ctx, companyId, employeeSeed, locationIds, positionIds),
    );
  }

  const shiftIds = await seedSchedules(ctx, companyId, locationIds, employeeIds, positionIds);
  await seedTimecards(ctx, companyId, locationIds, employeeIds, shiftIds);

  return {
    companyId,
    locationIds: Array.from(locationIds.values()),
    employeeCount: employees.length,
    locationCount: locations.length,
  };
}

export async function resetDemoData(ctx: MutationCtx) {
  const company = await ctx.db
    .query("companies")
    .withIndex("by_slug", (q) => q.eq("slug", DEMO_COMPANY_SLUG))
    .unique();

  if (company) {
    const locationsToDelete = await ctx.db
      .query("locations")
      .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
      .take(50);
    const employeesToDelete = await ctx.db
      .query("employees")
      .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
      .take(200);

    for (const location of locationsToDelete) {
      const schedules = await ctx.db
        .query("schedules")
        .withIndex("by_locationId", (q) => q.eq("locationId", location._id))
        .take(50);
      for (const schedule of schedules) {
        const shifts = await ctx.db
          .query("shifts")
          .withIndex("by_scheduleId", (q) => q.eq("scheduleId", schedule._id))
          .take(200);
        for (const shift of shifts) {
          await ctx.db.delete(shift._id);
        }
        await ctx.db.delete(schedule._id);
      }

      const timecards = await ctx.db
        .query("timecards")
        .withIndex("by_locationId_and_businessDate", (q) => q.eq("locationId", location._id))
        .take(200);
      for (const timecard of timecards) {
        const events = await ctx.db
          .query("timeEvents")
          .withIndex("by_timecardId", (q) => q.eq("timecardId", timecard._id))
          .take(50);
        for (const event of events) {
          await ctx.db.delete(event._id);
        }

        const edits = await ctx.db
          .query("timecardEdits")
          .withIndex("by_timecardId", (q) => q.eq("timecardId", timecard._id))
          .take(50);
        for (const edit of edits) {
          await ctx.db.delete(edit._id);
        }

        await ctx.db.delete(timecard._id);
      }

      const hours = await ctx.db
        .query("locationHours")
        .withIndex("by_locationId", (q) => q.eq("locationId", location._id))
        .take(14);
      for (const row of hours) {
        await ctx.db.delete(row._id);
      }

      const locationPositions = await ctx.db
        .query("positions")
        .withIndex("by_locationId", (q) => q.eq("locationId", location._id))
        .take(50);
      for (const position of locationPositions) {
        await ctx.db.delete(position._id);
      }

      await ctx.db.delete(location._id);
    }

    for (const employee of employeesToDelete) {
      const employeeAssignments = await ctx.db
        .query("employeeLocations")
        .withIndex("by_employeeId", (q) => q.eq("employeeId", employee._id))
        .take(50);
      for (const assignment of employeeAssignments) {
        await ctx.db.delete(assignment._id);
      }

      const managerAssignments = await ctx.db
        .query("managerLocations")
        .withIndex("by_managerId", (q) => q.eq("managerId", employee._id))
        .take(50);
      for (const assignment of managerAssignments) {
        await ctx.db.delete(assignment._id);
      }

      await ctx.db.delete(employee._id);
    }

    await ctx.db.delete(company._id);
  }

  return await ensureDemoData(ctx);
}
