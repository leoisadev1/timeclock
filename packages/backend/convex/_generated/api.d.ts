/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as demo from "../demo.js";
import type * as employees from "../employees.js";
import type * as healthCheck from "../healthCheck.js";
import type * as locations from "../locations.js";
import type * as privateData from "../privateData.js";
import type * as reports from "../reports.js";
import type * as schedules from "../schedules.js";
import type * as seed from "../seed.js";
import type * as seedData from "../seedData.js";
import type * as shared from "../shared.js";
import type * as timecards from "../timecards.js";
import type * as today from "../today.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  demo: typeof demo;
  employees: typeof employees;
  healthCheck: typeof healthCheck;
  locations: typeof locations;
  privateData: typeof privateData;
  reports: typeof reports;
  schedules: typeof schedules;
  seed: typeof seed;
  seedData: typeof seedData;
  shared: typeof shared;
  timecards: typeof timecards;
  today: typeof today;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
