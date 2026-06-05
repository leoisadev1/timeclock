import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensureDemoData } from "./seedData";
import { getDemoCompany } from "./shared";

export const bootstrap = mutation({
  args: {},
  handler: async (ctx) => {
    return await ensureDemoData(ctx);
  },
});

export const claimDemoManager = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NOT_AUTHENTICATED", message: "Sign in before claiming demo access." });
    }
    const employee = await ctx.db
      .query("employees")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (
      !employee ||
      !employee.active ||
      employee.demoPassword !== args.password ||
      !["admin", "manager"].includes(employee.role)
    ) {
      throw new ConvexError({ code: "INVALID_DEMO_LOGIN", message: "Invalid demo manager credentials." });
    }
    await ctx.db.patch(employee._id, {
      authTokenIdentifier: identity.tokenIdentifier,
      updatedAt: Date.now(),
    });
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
      .withIndex("by_companyId_and_role", (q) => q.eq("companyId", company._id).eq("role", "manager"))
      .take(5);
    const employees = await ctx.db
      .query("employees")
      .withIndex("by_companyId_and_role", (q) => q.eq("companyId", company._id).eq("role", "employee"))
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
      employeePins: employees.sort((a, b) => a.displayName.localeCompare(b.displayName)).map((employee) => ({
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
