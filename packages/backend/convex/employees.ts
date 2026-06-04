import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  employeeName,
  isEmployeeAssignedToLocation,
  requireDemoCompany,
  requireLocationManager,
  type ReaderCtx,
} from "./shared";

async function employeeReadModel(
  ctx: ReaderCtx,
  employeeId: Id<"employees">,
  locationId?: Id<"locations">,
) {
  const employee = await ctx.db.get(employeeId);
  if (!employee) {
    return null;
  }
  const position = employee.defaultPositionId ? await ctx.db.get(employee.defaultPositionId) : null;
  const assignedLocations = await ctx.db
    .query("employeeLocations")
    .withIndex("by_employeeId", (q) => q.eq("employeeId", employeeId))
    .take(20);
  const managerLocations = await ctx.db
    .query("managerLocations")
    .withIndex("by_managerId", (q) => q.eq("managerId", employeeId))
    .take(20);
  return {
    id: employee._id,
    displayName: employeeName(employee),
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email ?? null,
    pin: employee.pin,
    avatarUrl: employee.avatarUrl,
    role: employee.role,
    positionId: employee.defaultPositionId ?? null,
    positionName: position?.name ?? null,
    active: employee.active,
    locationId: locationId ?? null,
    assignedLocationIds: assignedLocations
      .filter((assignment) => assignment.active)
      .map((assignment) => assignment.locationId),
    managedLocationIds: managerLocations
      .filter((assignment) => assignment.active)
      .map((assignment) => assignment.locationId),
  };
}

export const listByLocation = query({
  args: { locationId: v.id("locations"), includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    const assignments = await ctx.db
      .query("employeeLocations")
      .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
      .take(200);
    const employees = [];
    for (const assignment of assignments) {
      if (!assignment.active) {
        continue;
      }
      const model = await employeeReadModel(ctx, assignment.employeeId, args.locationId);
      if (model && (args.includeInactive || model.active)) {
        employees.push(model);
      }
    }
    return employees.sort((a, b) => a.displayName.localeCompare(b.displayName));
  },
});

export const getByPinForLocation = query({
  args: { locationId: v.id("locations"), pin: v.string() },
  handler: async (ctx, args) => {
    const company = await requireDemoCompany(ctx);
    const employee = await ctx.db
      .query("employees")
      .withIndex("by_companyId_and_pin", (q) => q.eq("companyId", company._id).eq("pin", args.pin))
      .unique();
    if (!employee || !employee.active) {
      return null;
    }
    if (!(await isEmployeeAssignedToLocation(ctx, employee._id, args.locationId))) {
      return null;
    }
    return await employeeReadModel(ctx, employee._id, args.locationId);
  },
});

export const create = mutation({
  args: {
    locationId: v.id("locations"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    pin: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("employee")),
    defaultPositionId: v.id("positions"),
  },
  handler: async (ctx, args) => {
    const actor = await requireLocationManager(ctx, args.locationId);
    const position = await ctx.db.get(args.defaultPositionId);
    if (!position || position.locationId !== args.locationId) {
      throw new ConvexError({ code: "INVALID_POSITION", message: "Position must belong to location." });
    }
    const existing = await ctx.db
      .query("employees")
      .withIndex("by_companyId_and_pin", (q) => q.eq("companyId", actor.companyId).eq("pin", args.pin))
      .unique();
    if (existing) {
      throw new ConvexError({ code: "PIN_IN_USE", message: "PIN is already assigned." });
    }
    const timestamp = Date.now();
    const employeeData = {
      companyId: actor.companyId,
      firstName: args.firstName,
      lastName: args.lastName,
      displayName: `${args.firstName} ${args.lastName}`,
      pin: args.pin,
      avatarUrl:
        args.avatarUrl ??
        `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(args.firstName)}`,
      role: args.role,
      defaultPositionId: args.defaultPositionId,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const employeeId = await ctx.db.insert(
      "employees",
      args.email ? { ...employeeData, email: args.email } : employeeData,
    );
    await ctx.db.insert("employeeLocations", {
      employeeId,
      locationId: args.locationId,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    if (args.role === "manager") {
      await ctx.db.insert("managerLocations", {
        managerId: employeeId,
        locationId: args.locationId,
        active: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    return await employeeReadModel(ctx, employeeId, args.locationId);
  },
});

export const update = mutation({
  args: {
    employeeId: v.id("employees"),
    locationId: v.id("locations"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    pin: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("manager"), v.literal("employee"))),
    defaultPositionId: v.optional(v.id("positions")),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Employee not found." });
    }
    const newPin = args.pin;
    if (newPin && newPin !== employee.pin) {
      const existing = await ctx.db
        .query("employees")
        .withIndex("by_companyId_and_pin", (q) =>
          q.eq("companyId", employee.companyId).eq("pin", newPin),
        )
        .unique();
      if (existing) {
        throw new ConvexError({ code: "PIN_IN_USE", message: "PIN is already assigned." });
      }
    }
    if (args.defaultPositionId) {
      const position = await ctx.db.get(args.defaultPositionId);
      if (!position || position.locationId !== args.locationId) {
        throw new ConvexError({ code: "INVALID_POSITION", message: "Position must belong to location." });
      }
    }

    const firstName = args.firstName ?? employee.firstName;
    const lastName = args.lastName ?? employee.lastName;
    const patch: Partial<{
      firstName: string;
      lastName: string;
      displayName: string;
      email: string;
      pin: string;
      avatarUrl: string;
      role: "admin" | "manager" | "employee";
      defaultPositionId: Id<"positions">;
      active: boolean;
      updatedAt: number;
    }> = {
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      updatedAt: Date.now(),
    };
    if (args.email !== undefined) patch.email = args.email;
    if (args.pin !== undefined) patch.pin = args.pin;
    if (args.avatarUrl !== undefined) patch.avatarUrl = args.avatarUrl;
    if (args.role !== undefined) patch.role = args.role;
    if (args.defaultPositionId !== undefined) patch.defaultPositionId = args.defaultPositionId;
    if (args.active !== undefined) patch.active = args.active;
    await ctx.db.patch(args.employeeId, patch);
    return await employeeReadModel(ctx, args.employeeId, args.locationId);
  },
});

export const deactivate = mutation({
  args: { employeeId: v.id("employees"), locationId: v.id("locations") },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    await ctx.db.patch(args.employeeId, { active: false, updatedAt: Date.now() });
    return await employeeReadModel(ctx, args.employeeId, args.locationId);
  },
});
