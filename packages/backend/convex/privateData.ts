import { query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

export const get = query({
  args: {},
  returns: v.object({
    message: v.string(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new ConvexError({
        code: "NOT_AUTHENTICATED",
        message: "Not authenticated",
      });
    }
    return {
      message: "This is private",
    };
  },
});
