import { mutation } from "./_generated/server";
import { ensureDemoData as ensure } from "./seedData";

export const ensureDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    return await ensure(ctx);
  },
});
