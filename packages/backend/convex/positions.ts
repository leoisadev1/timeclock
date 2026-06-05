import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireLocationManager } from "./shared";

function positionModel(position: {
  _id: import("./_generated/dataModel").Id<"positions">;
  name: string;
  color: string;
  active: boolean;
}) {
  return {
    id: position._id,
    name: position.name,
    color: position.color,
    active: position.active,
  };
}

export const listByLocation = query({
  args: { locationId: v.id("locations"), includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_locationId", (q) => q.eq("locationId", args.locationId))
      .take(100);
    return positions
      .filter((position) => args.includeInactive || position.active)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(positionModel);
  },
});

export const create = mutation({
  args: {
    locationId: v.id("locations"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireLocationManager(ctx, args.locationId);
    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new ConvexError({ code: "INVALID_NAME", message: "Position name is required." });
    }
    const existing = await ctx.db
      .query("positions")
      .withIndex("by_locationId_and_name", (q) =>
        q.eq("locationId", args.locationId).eq("name", trimmedName),
      )
      .unique();
    if (existing?.active) {
      throw new ConvexError({
        code: "DUPLICATE",
        message: "A position with this name already exists.",
      });
    }
    const timestamp = Date.now();
    if (existing && !existing.active) {
      await ctx.db.patch(existing._id, {
        name: trimmedName,
        color: args.color,
        active: true,
        updatedAt: timestamp,
      });
      const reactivated = await ctx.db.get(existing._id);
      if (!reactivated) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Position could not be reactivated." });
      }
      return positionModel(reactivated);
    }
    const positionId = await ctx.db.insert("positions", {
      companyId: actor.companyId,
      locationId: args.locationId,
      name: trimmedName,
      color: args.color,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const created = await ctx.db.get(positionId);
    if (!created) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Position could not be created." });
    }
    return positionModel(created);
  },
});

export const update = mutation({
  args: {
    locationId: v.id("locations"),
    positionId: v.id("positions"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    const position = await ctx.db.get(args.positionId);
    if (!position || position.locationId !== args.locationId || !position.active) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Position not found." });
    }
    const trimmedName = args.name?.trim();
    if (trimmedName && trimmedName !== position.name) {
      const duplicate = await ctx.db
        .query("positions")
        .withIndex("by_locationId_and_name", (q) =>
          q.eq("locationId", args.locationId).eq("name", trimmedName),
        )
        .unique();
      if (duplicate && duplicate._id !== position._id && duplicate.active) {
        throw new ConvexError({
          code: "DUPLICATE",
          message: "A position with this name already exists.",
        });
      }
    }
    await ctx.db.patch(args.positionId, {
      ...(trimmedName ? { name: trimmedName } : {}),
      ...(args.color !== undefined ? { color: args.color } : {}),
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get(args.positionId);
    if (!updated) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Position not found." });
    }
    return positionModel(updated);
  },
});

export const deactivate = mutation({
  args: {
    locationId: v.id("locations"),
    positionId: v.id("positions"),
  },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    const position = await ctx.db.get(args.positionId);
    if (!position || position.locationId !== args.locationId || !position.active) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Position not found." });
    }
    await ctx.db.patch(args.positionId, { active: false, updatedAt: Date.now() });
    return { id: args.positionId };
  },
});
