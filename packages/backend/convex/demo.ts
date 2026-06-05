import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { ensureDemoData, resetDemoData } from "./seedData";
import type { MutationCtx } from "./_generated/server";
import { getDemoCompany, requireDemoCompany, type ReaderCtx } from "./shared";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findManagerByEmail(ctx: ReaderCtx, email: string): Promise<Doc<"employees"> | null> {
  const normalized = normalizeEmail(email);
  const byNormalized = await ctx.db
    .query("employees")
    .withIndex("by_email", (q) => q.eq("email", normalized))
    .unique();
  if (byNormalized) {
    return byNormalized;
  }
  return await ctx.db
    .query("employees")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
}

async function linkEmployeeToIdentity(
  ctx: MutationCtx,
  employee: Doc<"employees">,
  tokenIdentifier: string,
  email?: string,
) {
  await ctx.db.patch(employee._id, {
    authTokenIdentifier: tokenIdentifier,
    ...(email ? { email: normalizeEmail(email) } : {}),
    updatedAt: Date.now(),
  });
}

async function findSeededManagerForIdentity(
  ctx: MutationCtx,
  companyId: Doc<"companies">["_id"],
  email?: string,
): Promise<Doc<"employees"> | null> {
  if (email) {
    const byEmail = await findManagerByEmail(ctx, email);
    if (byEmail?.active && ["admin", "manager"].includes(byEmail.role)) {
      return byEmail;
    }
  }

  const managers = await ctx.db
    .query("employees")
    .withIndex("by_companyId_and_role", (q) => q.eq("companyId", companyId).eq("role", "manager"))
    .take(1);
  if (managers[0]?.active) {
    return managers[0];
  }

  const admins = await ctx.db
    .query("employees")
    .withIndex("by_companyId_and_role", (q) => q.eq("companyId", companyId).eq("role", "admin"))
    .take(1);
  return admins[0]?.active ? admins[0] : null;
}

export const bootstrap = mutation({
  args: {},
  handler: async (ctx) => {
    return await ensureDemoData(ctx);
  },
});

export const resetAndSeedForCurrentUser = mutation({
  args: {},
  returns: v.object({
    companyId: v.id("companies"),
    locationIds: v.array(v.id("locations")),
    employeeCount: v.number(),
    locationCount: v.number(),
    linkedManager: v.object({
      employeeId: v.id("employees"),
      name: v.string(),
      role: v.union(v.literal("admin"), v.literal("manager")),
    }),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "NOT_AUTHENTICATED",
        message: "Sign in with Clerk before seeding your manager workspace.",
      });
    }

    const seeded = await resetDemoData(ctx);
    const manager = await findSeededManagerForIdentity(ctx, seeded.companyId, identity.email);
    if (!manager) {
      throw new ConvexError({
        code: "DEMO_MANAGER_MISSING",
        message: "Seeded manager access could not be created.",
      });
    }

    await linkEmployeeToIdentity(ctx, manager, identity.tokenIdentifier, identity.email);

    return {
      ...seeded,
      linkedManager: {
        employeeId: manager._id,
        name: manager.displayName,
        role: manager.role as "admin" | "manager",
      },
    };
  },
});

export const linkCurrentManager = mutation({
  args: {},
  returns: v.object({
    employeeId: v.id("employees"),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager")),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new ConvexError({
        code: "NOT_AUTHENTICATED",
        message: "Sign in with an email address before linking manager access.",
      });
    }

    await requireDemoCompany(ctx);

    const employee = await findManagerByEmail(ctx, identity.email);
    if (!employee || !employee.active || !["admin", "manager"].includes(employee.role)) {
      throw new ConvexError({
        code: "NOT_LINKABLE",
        message: "No active admin or manager record matches your signed-in email.",
      });
    }

    await linkEmployeeToIdentity(ctx, employee, identity.tokenIdentifier, identity.email);
    return {
      employeeId: employee._id,
      name: employee.displayName,
      role: employee.role as "admin" | "manager",
    };
  },
});

export const claimDemoManager = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "NOT_AUTHENTICATED",
        message: "Sign in before claiming demo access.",
      });
    }

    if (!(await getDemoCompany(ctx))) {
      await ensureDemoData(ctx);
    }

    const employee = await findManagerByEmail(ctx, args.email);
    if (
      !employee ||
      !employee.active ||
      employee.demoPassword !== args.password ||
      !["admin", "manager"].includes(employee.role)
    ) {
      throw new ConvexError({
        code: "INVALID_DEMO_LOGIN",
        message: "Invalid demo manager credentials.",
      });
    }
    await linkEmployeeToIdentity(ctx, employee, identity.tokenIdentifier, identity.email);
    return {
      employeeId: employee._id,
      name: employee.displayName,
      role: employee.role,
    };
  },
});

export const getDemoLogin = query({
  args: {},
  handler: async (ctx) => {
    const company = await getDemoCompany(ctx);
    if (!company) {
      return {
        seeded: false,
        manager: null,
        admin: null,
        employeePins: [],
      };
    }

    const admins = await ctx.db
      .query("employees")
      .withIndex("by_companyId_and_role", (q) => q.eq("companyId", company._id).eq("role", "admin"))
      .take(5);
    const managers = await ctx.db
      .query("employees")
      .withIndex("by_companyId_and_role", (q) =>
        q.eq("companyId", company._id).eq("role", "manager"),
      )
      .take(5);
    const employees = await ctx.db
      .query("employees")
      .withIndex("by_companyId_and_role", (q) =>
        q.eq("companyId", company._id).eq("role", "employee"),
      )
      .take(50);

    const credential = (employee: (typeof admins)[number] | undefined) =>
      employee
        ? {
            employeeId: employee._id,
            name: employee.displayName,
            email: employee.email ?? "",
            password: employee.demoPassword ?? "",
            pin: employee.pin,
            role: employee.role,
          }
        : null;

    return {
      seeded: true,
      company: { id: company._id, name: company.name },
      admin: credential(admins[0]),
      manager: credential(managers[0]),
      employeePins: employees
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((employee) => ({
          employeeId: employee._id,
          name: employee.displayName,
          pin: employee.pin,
          avatarUrl: employee.avatarUrl,
        })),
    };
  },
});

export const getStatus = query({
  args: {},
  returns: v.object({
    seeded: v.boolean(),
    companyName: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const company = await getDemoCompany(ctx);
    return {
      seeded: company !== null,
      companyName: company?.name ?? null,
    };
  },
});
