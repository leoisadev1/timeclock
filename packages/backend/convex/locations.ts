import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  canManageLocation,
  error,
  getCurrentEmployee,
  getLocationHours,
  requireCurrentEmployee,
  requireDemoCompany,
  requireLocationManager,
  requireRole,
} from "./shared";

async function locationReadModel(ctx: Parameters<typeof getLocationHours>[0], locationId: Id<"locations">) {
  const location = await ctx.db.get(locationId);
  if (!location) {
    return null;
  }
  const hours = await getLocationHours(ctx, locationId);
  return {
    id: location._id,
    name: location.name,
    address: location.address,
    timezone: location.timezone,
    weekStartDay: location.weekStartDay,
    lateGraceMinutes: location.lateGraceMinutes,
    noShowThresholdMinutes: location.noShowThresholdMinutes,
    stationUnlockCode: location.stationUnlockCode,
    active: location.active,
    hours: hours.map((row) => ({
      id: row._id,
      dayOfWeek: row.dayOfWeek,
      opensAtMinutes: row.opensAtMinutes,
      closesAtMinutes: row.closesAtMinutes,
      isClosed: row.isClosed,
    })),
  };
}

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const employee = await getCurrentEmployee(ctx);
    if (!employee || !employee.active) {
      return [];
    }
    if (employee.role === "admin") {
      const locations = await ctx.db
        .query("locations")
        .withIndex("by_companyId_and_active", (q) =>
          q.eq("companyId", employee.companyId).eq("active", true),
        )
        .take(50);
      return await Promise.all(locations.map((location) => locationReadModel(ctx, location._id)));
    }
    if (employee.role === "manager") {
      const assignments = await ctx.db
        .query("managerLocations")
        .withIndex("by_managerId", (q) => q.eq("managerId", employee._id))
        .take(50);
      const models = [];
      for (const assignment of assignments) {
        if (assignment.active) {
          const model = await locationReadModel(ctx, assignment.locationId);
          if (model?.active) {
            models.push(model);
          }
        }
      }
      return models;
    }

    const assignments = await ctx.db
      .query("employeeLocations")
      .withIndex("by_employeeId", (q) => q.eq("employeeId", employee._id))
      .take(50);
    const models = [];
    for (const assignment of assignments) {
      if (assignment.active) {
        const model = await locationReadModel(ctx, assignment.locationId);
        if (model?.active) {
          models.push(model);
        }
      }
    }
    return models;
  },
});

export const getSettings = query({
  args: { locationId: v.id("locations") },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    return await locationReadModel(ctx, args.locationId);
  },
});

export const updateSettings = mutation({
  args: {
    locationId: v.id("locations"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    timezone: v.optional(v.string()),
    weekStartDay: v.optional(v.number()),
    lateGraceMinutes: v.optional(v.number()),
    noShowThresholdMinutes: v.optional(v.number()),
    stationUnlockCode: v.optional(v.string()),
    active: v.optional(v.boolean()),
    hours: v.optional(
      v.array(
        v.object({
          dayOfWeek: v.number(),
          opensAtMinutes: v.number(),
          closesAtMinutes: v.number(),
          isClosed: v.boolean(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    const patch: Partial<{
      name: string;
      address: string;
      timezone: string;
      weekStartDay: number;
      lateGraceMinutes: number;
      noShowThresholdMinutes: number;
      stationUnlockCode: string;
      active: boolean;
      updatedAt: number;
    }> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.address !== undefined) patch.address = args.address;
    if (args.timezone !== undefined) patch.timezone = args.timezone;
    if (args.weekStartDay !== undefined) patch.weekStartDay = args.weekStartDay;
    if (args.lateGraceMinutes !== undefined) patch.lateGraceMinutes = args.lateGraceMinutes;
    if (args.noShowThresholdMinutes !== undefined) {
      patch.noShowThresholdMinutes = args.noShowThresholdMinutes;
    }
    if (args.stationUnlockCode !== undefined) patch.stationUnlockCode = args.stationUnlockCode;
    if (args.active !== undefined) patch.active = args.active;
    await ctx.db.patch(args.locationId, patch);

    for (const hours of args.hours ?? []) {
      const existing = await ctx.db
        .query("locationHours")
        .withIndex("by_locationId_and_dayOfWeek", (q) =>
          q.eq("locationId", args.locationId).eq("dayOfWeek", hours.dayOfWeek),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, hours);
      } else {
        await ctx.db.insert("locationHours", { locationId: args.locationId, ...hours });
      }
    }

    return await locationReadModel(ctx, args.locationId);
  },
});

const DEFAULT_POSITIONS = [
  { name: "Manager", color: "#2563eb" },
  { name: "Shift Lead", color: "#0f766e" },
  { name: "Cashier", color: "#ca8a04" },
  { name: "Barista", color: "#9333ea" },
  { name: "Cook", color: "#dc2626" },
] as const;

const DEFAULT_HOURS = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  opensAtMinutes: 6 * 60,
  closesAtMinutes: 18 * 60,
  isClosed: false,
}));

export const create = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    timezone: v.string(),
    weekStartDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const employee = await requireCurrentEmployee(ctx);
    requireRole(employee, ["admin", "manager"]);

    const name = args.name.trim();
    const address = args.address.trim();
    if (!name) {
      throw error("INVALID_NAME", "Location name is required.");
    }
    if (!address) {
      throw error("INVALID_ADDRESS", "Address is required.");
    }

    const timestamp = Date.now();
    const locationId = await ctx.db.insert("locations", {
      companyId: employee.companyId,
      name,
      address,
      timezone: args.timezone,
      weekStartDay: args.weekStartDay ?? 1,
      lateGraceMinutes: 5,
      noShowThresholdMinutes: 15,
      stationUnlockCode: String(Math.floor(1000 + Math.random() * 9000)),
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    for (const hours of DEFAULT_HOURS) {
      await ctx.db.insert("locationHours", { locationId, ...hours });
    }

    for (const position of DEFAULT_POSITIONS) {
      await ctx.db.insert("positions", {
        companyId: employee.companyId,
        locationId,
        name: position.name,
        color: position.color,
        active: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    if (employee.role === "manager") {
      await ctx.db.insert("managerLocations", {
        managerId: employee._id,
        locationId,
        active: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    return await locationReadModel(ctx, locationId);
  },
});

export const listDemoLocations = query({
  args: {},
  handler: async (ctx) => {
    const company = await requireDemoCompany(ctx);
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
      .take(20);
    return await Promise.all(locations.map((location) => locationReadModel(ctx, location._id)));
  },
});
