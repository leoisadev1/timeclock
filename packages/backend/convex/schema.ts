import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(v.literal("admin"), v.literal("manager"), v.literal("employee"));
const punchSource = v.union(
  v.literal("station"),
  v.literal("employee_web"),
  v.literal("manager_edit"),
);
const timecardStatus = v.union(
  v.literal("clocked_in"),
  v.literal("on_break"),
  v.literal("clocked_out"),
);
const attendanceStatus = v.union(
  v.literal("early"),
  v.literal("on_time"),
  v.literal("late"),
  v.literal("no_show"),
  v.literal("unscheduled"),
);
const eventType = v.union(
  v.literal("clock_in"),
  v.literal("start_break"),
  v.literal("end_break"),
  v.literal("clock_out"),
  v.literal("manager_edit"),
);

const timecardSnapshot = v.object({
  clockInAt: v.number(),
  clockOutAt: v.union(v.number(), v.null()),
  status: timecardStatus,
  attendanceStatus,
  totalBreakMinutes: v.number(),
  shiftId: v.union(v.id("shifts"), v.null()),
});

export default defineSchema({
  companies: defineTable({
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  locations: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    address: v.string(),
    timezone: v.string(),
    weekStartDay: v.number(),
    lateGraceMinutes: v.number(),
    noShowThresholdMinutes: v.number(),
    stationUnlockCode: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_companyId_and_active", ["companyId", "active"]),

  locationHours: defineTable({
    locationId: v.id("locations"),
    dayOfWeek: v.number(),
    opensAtMinutes: v.number(),
    closesAtMinutes: v.number(),
    isClosed: v.boolean(),
  })
    .index("by_locationId", ["locationId"])
    .index("by_locationId_and_dayOfWeek", ["locationId", "dayOfWeek"]),

  positions: defineTable({
    companyId: v.id("companies"),
    locationId: v.id("locations"),
    name: v.string(),
    color: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_locationId", ["locationId"])
    .index("by_locationId_and_name", ["locationId", "name"]),

  employees: defineTable({
    companyId: v.id("companies"),
    firstName: v.string(),
    lastName: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    demoPassword: v.optional(v.string()),
    pin: v.string(),
    avatarUrl: v.string(),
    role,
    defaultPositionId: v.optional(v.id("positions")),
    active: v.boolean(),
    authTokenIdentifier: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_companyId", ["companyId"])
    .index("by_pin", ["pin"])
    .index("by_companyId_and_pin", ["companyId", "pin"])
    .index("by_companyId_and_role", ["companyId", "role"])
    .index("by_companyId_and_active", ["companyId", "active"])
    .index("by_authTokenIdentifier", ["authTokenIdentifier"])
    .index("by_email", ["email"]),

  employeeLocations: defineTable({
    employeeId: v.id("employees"),
    locationId: v.id("locations"),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employeeId", ["employeeId"])
    .index("by_locationId", ["locationId"])
    .index("by_employeeId_and_locationId", ["employeeId", "locationId"]),

  managerLocations: defineTable({
    managerId: v.id("employees"),
    locationId: v.id("locations"),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_managerId", ["managerId"])
    .index("by_locationId", ["locationId"])
    .index("by_managerId_and_locationId", ["managerId", "locationId"]),

  schedules: defineTable({
    companyId: v.id("companies"),
    locationId: v.id("locations"),
    weekStartDate: v.string(),
    isPublished: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_locationId", ["locationId"])
    .index("by_locationId_and_weekStartDate", ["locationId", "weekStartDate"]),

  shifts: defineTable({
    scheduleId: v.id("schedules"),
    locationId: v.id("locations"),
    employeeId: v.optional(v.id("employees")),
    positionId: v.id("positions"),
    startAt: v.number(),
    endAt: v.number(),
    startBusinessDate: v.string(),
    plannedBreakMinutes: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_scheduleId", ["scheduleId"])
    .index("by_employeeId", ["employeeId"])
    .index("by_positionId", ["positionId"])
    .index("by_locationId_and_startBusinessDate", ["locationId", "startBusinessDate"]),

  timecards: defineTable({
    companyId: v.id("companies"),
    locationId: v.id("locations"),
    employeeId: v.id("employees"),
    shiftId: v.optional(v.id("shifts")),
    businessDate: v.string(),
    clockInAt: v.number(),
    clockOutAt: v.optional(v.number()),
    status: timecardStatus,
    attendanceStatus,
    totalBreakMinutes: v.number(),
    source: punchSource,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employeeId_and_status", ["employeeId", "status"])
    .index("by_locationId_and_businessDate", ["locationId", "businessDate"])
    .index("by_shiftId", ["shiftId"])
    .index("by_employeeId_and_businessDate", ["employeeId", "businessDate"]),

  timeEvents: defineTable({
    timecardId: v.id("timecards"),
    type: eventType,
    occurredAt: v.number(),
    source: punchSource,
    note: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_timecardId", ["timecardId"]),

  timecardEdits: defineTable({
    timecardId: v.id("timecards"),
    editedByEmployeeId: v.id("employees"),
    editedAt: v.number(),
    before: timecardSnapshot,
    after: timecardSnapshot,
    note: v.string(),
  }).index("by_timecardId", ["timecardId"]),
});
